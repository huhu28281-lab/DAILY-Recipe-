// [5] 수치 채우기 — 영양 DB → kcal·영양소 / 가격 DB → 끼니별·주간 비용. 명세 §5, §2.1, §2.4.
//
// step [3](LLM)은 메뉴 구성만 만들고 칼로리·영양소·가격·금액은 절대 만들지 않는다(§6 Absolute
// Constraints #3) — 그 빈 자리를 이 단계가 채운다. 입력은 step [4]를 통과한 GeneratedMealDraft이고,
// 출력은 §7 스키마의 Meal에 대응하는 수치들이다.
//
// 가정: ingredients[].amount는 g 또는 ml 기준이다 — nutrition_facts/price_reference가
// 100g(ml)당 값으로 시딩돼 있기 때문이다(apps/api/src/db/seed/002_dev_ingredients_30.sql).
// 계란·두부처럼 개수/모 단위(ea/block)로 파는 재료를 정확히 계산하려면 g 환산 계수가 필요한데
// 아직 ingredient_master에 그 컬럼이 없다 — 이 단계의 범위 밖이며, 후속 작업(예: ingredient_master에
// default_unit_grams 추가)이 필요하다는 점을 여기 명시해 둔다.

import type { GeneratedMealDraft } from "./4-validate";
import type { IngredientSource, PriceSource } from "../types/schema";

export type IngredientNutritionPer100 = {
  kcalPer100g: number;
  carbGPer100g: number;
  proteinGPer100g: number;
  fatGPer100g: number;
};

export type IngredientPriceInfo = {
  packageQuantity: number | null;
  packagePriceKrw: number | null;
  priceSource: PriceSource;
};

export type FillValuesContext = {
  /** 이 끼니를 나눠 먹는 인원수. calories_per_person = round(총 kcal ÷ householdSize). */
  householdSize: number;
  nutritionByIngredientId: Record<string, IngredientNutritionPer100>;
  priceByIngredientId: Record<string, IngredientPriceInfo>;
  /** §2.2/§2.4: 양념류는 냉장고 활용 지표 분모와 끼니 비용 계산 양쪽에서 제외한다 (kcal 계산에서는 제외하지 않는다). */
  isStapleByIngredientId: Record<string, boolean>;
};

export type FilledIngredient = {
  ingredientId: string;
  amount: number;
  source: IngredientSource;
  /** 가격을 못 찾았거나(is_staple) 계산 대상이 아니면 없다. */
  unitPriceKrw?: number;
  extraCostKrw?: number;
};

export type FilledMeal = {
  mealSlotId: string;
  caloriesPerPerson: number;
  caloriesHousehold: number;
  /** §2.2: 그 끼니 하나의 coverage가 1.0일 때만 "집에 있는 재료로 100%" 배지를 쓴다. */
  mealCoverageRate: number;
  /** §2.4 meal_extra_cost — 구매 필요한 비양념 재료만, 백 원 단위 반올림. */
  mealExtraCostKrw: number;
  /** §2.4 meal_total_cost — 보유 재료 포함 전체 원가(비양념), 백 원 단위 반올림. */
  mealTotalCostKrw: number;
  /** true면 카드에 "약 9,800원+"처럼 표기한다. */
  hasUnpricedIngredient: boolean;
  ingredients: FilledIngredient[];
};

const COST_ROUNDING_UNIT_KRW = 100;

function roundToNearest(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/** packagePriceKrw ÷ packageQuantity = 재료 1g(ml)당 단가. 가격을 확정할 수 없으면 undefined. */
function resolveUnitPriceKrw(price: IngredientPriceInfo | undefined): number | undefined {
  if (
    !price ||
    price.priceSource === "unavailable" ||
    price.packageQuantity === null ||
    price.packagePriceKrw === null ||
    price.packageQuantity === 0
  ) {
    return undefined;
  }
  return price.packagePriceKrw / price.packageQuantity;
}

/**
 * step [5]: 재료별 영양 DB·가격 DB 조회 결과로 draft의 재료 목록에 없던 수치를 채워 FilledMeal을 만든다.
 * LLM이 만든 menu_name·cook_time_min·difficulty·재료 구성 자체는 건드리지 않는다.
 */
export function fillMealValues(draft: GeneratedMealDraft, context: FillValuesContext): FilledMeal {
  let totalKcal = 0;
  let mealExtraCostKrw = 0;
  let mealTotalCostKrw = 0;
  let hasUnpricedIngredient = false;
  let nonStapleCount = 0;
  let nonStaplePantryCount = 0;

  const filledIngredients: FilledIngredient[] = draft.ingredients.map((ingredient) => {
    const nutrition = context.nutritionByIngredientId[ingredient.ingredientId];
    if (nutrition) {
      totalKcal += (nutrition.kcalPer100g * ingredient.amount) / 100;
    }

    const isStaple = context.isStapleByIngredientId[ingredient.ingredientId] ?? false;

    // §2.2/§2.4: 양념은 비용·활용률 계산에서 통째로 빠진다 — 가격이 없어도 "미확인"으로 취급하지 않는다.
    if (isStaple) {
      return { ingredientId: ingredient.ingredientId, amount: ingredient.amount, source: ingredient.declaredSource };
    }

    nonStapleCount += 1;
    if (ingredient.declaredSource === "pantry") {
      nonStaplePantryCount += 1;
    }

    const unitPriceKrw = resolveUnitPriceKrw(context.priceByIngredientId[ingredient.ingredientId]);
    if (unitPriceKrw === undefined) {
      hasUnpricedIngredient = true;
      return { ingredientId: ingredient.ingredientId, amount: ingredient.amount, source: ingredient.declaredSource };
    }

    const extraCostKrw = unitPriceKrw * ingredient.amount;
    mealTotalCostKrw += extraCostKrw; // §2.4 meal_total_cost: 보유 재료 포함 전체 원가
    if (ingredient.declaredSource === "purchase") {
      mealExtraCostKrw += extraCostKrw; // §2.4 meal_extra_cost: 구매 필요 재료만
    }

    return {
      ingredientId: ingredient.ingredientId,
      amount: ingredient.amount,
      source: ingredient.declaredSource,
      unitPriceKrw,
      extraCostKrw,
    };
  });

  const caloriesPerPerson = Math.round(totalKcal / context.householdSize);
  // 가구 합계는 반올림한 1인분의 배수다 — 원시 총 kcal과 살짝 달라질 수 있지만,
  // 화면에 표시되는 1인분·가구 숫자가 서로 정수배로 맞아떨어지는 게 더 중요하다.
  const caloriesHousehold = caloriesPerPerson * context.householdSize;

  // §2.2: 그 끼니 하나의 coverage가 1.0일 때만 "집에 있는 재료로 100%" 배지를 쓴다.
  // 비양념 재료가 하나도 없으면(전부 양념) 살 것도 없다는 뜻이니 완전 커버로 취급한다.
  const mealCoverageRate = nonStapleCount === 0 ? 1 : nonStaplePantryCount / nonStapleCount;

  return {
    mealSlotId: draft.mealSlotId,
    caloriesPerPerson,
    caloriesHousehold,
    mealCoverageRate,
    mealExtraCostKrw: roundToNearest(mealExtraCostKrw, COST_ROUNDING_UNIT_KRW),
    mealTotalCostKrw: roundToNearest(mealTotalCostKrw, COST_ROUNDING_UNIT_KRW),
    hasUnpricedIngredient,
    ingredients: filledIngredients,
  };
}
