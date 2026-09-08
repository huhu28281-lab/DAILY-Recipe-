// [4] 검증 가드 — 실패 시 [3] 재호출, 최대 3회. 명세 §5 검증 가드 표(V-01~V-05).
//
// 이 단계는 V-01~V-05 다섯 개 순수 가드(src/validators/guards.ts)를 하나의 파이프라인으로 묶는다.
// 가드마다 실패 시 동작이 다르다:
//   - V-01(알레르기) · V-02(조리시간) → 위반이 있는 "그 끼니만" 재생성 대상으로 표시한다.
//   - V-03(다양성)                    → 연속 주재료·주간 중복·이력 중복률은 끼니 하나만 바꿔서는
//                                       못 고치는 주 전체 구조의 문제라, 이번 주 전체를 재생성 대상으로 표시한다.
//   - V-05(ingredient_id)             → 퍼지 매칭으로 복구되면 그 자리에서 조용히 고치고(재생성 없음),
//                                       끝내 못 찾은 재료가 있는 끼니만 재생성 대상으로 표시한다.
//   - V-04(재고 원장)                  → 절대 재생성을 유발하지 않는다. 초과분을 purchase로 바꿔 항상 통과한다.
// 한 번의 시도(attempt)에서 여러 가드가 동시에 실패해도 재생성 대상 끼니를 모아 재호출은 한 번만 한다.
// 재생성은 최대 3회(§5)까지 시도하고, 그래도 통과하지 못하면 실패로 끝내 상위 단계가 §5 "실패 폴백"
// (사전 큐레이션 템플릿 + "기본 추천 식단" 배지)을 쓰도록 넘긴다.
//
// 실제 LLM 재호출(step [3])은 이 파일의 관심사가 아니다 — RegenerateMealSlots로 주입받아
// 오케스트레이션(가드 순서 · 재시도 횟수 · 부분/전체 재생성 판단)만 테스트 가능하게 분리했다.

import {
  checkAllergenGuard,
  checkCookTimeGuard,
  checkDiversityGuard,
  checkIngredientIdGuard,
  checkInventoryGuard,
  type CorrectedUsage,
  type IngredientIdResolution,
  type IngredientMasterRef,
  type MealType,
  type PantryLedgerEntry,
  type PantryUsage,
} from "../validators/guards";
import type { IngredientSource, ValidationSummary } from "../types/schema";

export type DraftIngredient = {
  ingredientId: string;
  amount: number;
  declaredSource: IngredientSource;
};

export type Difficulty = "하" | "중" | "상";

/**
 * step [3](LLM 메뉴 생성)의 산출물 한 끼니. 검증 가드 5개(이 파일)와 수치 채우기(step [5],
 * src/pipeline/5-fill-values.ts)가 필요로 하는 필드를 모두 담는다 — menu_name·cook_time_min·
 * difficulty·ingredients(어떤 재료를 얼마나)는 LLM이 채우고, kcal·비용은 여기서 채우지 않는다
 * (§6 Absolute Constraints #3).
 */
export type GeneratedMealDraft = {
  mealSlotId: string;
  mealType: MealType;
  menuName: string;
  cookTimeMin: number;
  difficulty: Difficulty;
  /** V-03 "연속 3끼니 주재료 중복 금지" 판정 기준. */
  mainIngredientId: string;
  ingredients: DraftIngredient[];
};

export type ValidationContext = {
  householdAllergenUnion: string[];
  ingredientAllergenMap: Record<string, string[]>;
  recentMenuNamesLast4Weeks: string[];
  initialPantryQuantities: Record<string, number>;
  validIngredientMaster: IngredientMasterRef[];
  fuzzyMatchMaxDistance?: number;
};

/**
 * step [3] 재호출을 흉내내는 콜백. 실제로는 LLM 호출 결과를 새 GeneratedMealDraft[]로 돌려준다.
 * mealSlotIds에 담긴 끼니만 새로 만들고, 나머지는 previousMeals와 동일하게 유지해서 돌려줘야 한다
 * (오케스트레이터는 반환값 전체로 currentMeals를 교체하므로, 요청하지 않은 끼니를 건드리면 유실된다).
 */
export type RegenerateMealSlots = (args: {
  mealSlotIds: string[];
  attempt: number;
  previousMeals: GeneratedMealDraft[];
}) => GeneratedMealDraft[];

export type RunValidationPipelineInput = {
  meals: GeneratedMealDraft[];
  context: ValidationContext;
  regenerate: RegenerateMealSlots;
  /** §5: 최대 3회. 테스트나 특수 상황을 위해 조정 가능하게 열어둔다. */
  maxAttempts?: number;
};

export type RunValidationPipelineResult = {
  status: "passed" | "failed_after_max_attempts";
  meals: GeneratedMealDraft[];
  regenerationCount: number;
  /** §7 validation 객체와 동일한 모양. V-05는 내부 게이트일 뿐 이 요약에는 노출하지 않는다(§7 스키마와 동일). */
  validation: ValidationSummary;
  /** V-04 산출물. step [5] 수치 채우기에서 그대로 이어받는다. */
  inventory: {
    correctedUsages: CorrectedUsage[];
    ledger: PantryLedgerEntry[];
  };
};

const DEFAULT_MAX_REGENERATION_ATTEMPTS = 3;

function buildPantryUsages(meals: GeneratedMealDraft[]): PantryUsage[] {
  return meals.flatMap((meal) =>
    meal.ingredients.map((ingredient) => ({
      mealSlotId: meal.mealSlotId,
      ingredientId: ingredient.ingredientId,
      amount: ingredient.amount,
      declaredSource: ingredient.declaredSource,
    })),
  );
}

function evaluateGuards(meals: GeneratedMealDraft[], context: ValidationContext) {
  const allergenResult = checkAllergenGuard({
    householdAllergenUnion: context.householdAllergenUnion,
    ingredientAllergenMap: context.ingredientAllergenMap,
    meals: meals.map((m) => ({
      mealSlotId: m.mealSlotId,
      ingredientIds: m.ingredients.map((i) => i.ingredientId),
    })),
  });

  const cookTimeResult = checkCookTimeGuard({
    meals: meals.map((m) => ({ mealSlotId: m.mealSlotId, mealType: m.mealType, cookTimeMin: m.cookTimeMin })),
  });

  const diversityResult = checkDiversityGuard({
    orderedMeals: meals.map((m) => ({
      mealSlotId: m.mealSlotId,
      menuName: m.menuName,
      mainIngredientId: m.mainIngredientId,
    })),
    recentMenuNamesLast4Weeks: context.recentMenuNamesLast4Weeks,
  });

  // V-05는 개별 재료 단위라 (mealSlotId, ingredientId) 위치를 펼쳐서 넘기고, 결과를 같은 순서로 되돌려 받는다.
  const flattenedOccurrences = meals.flatMap((meal) =>
    meal.ingredients.map((ingredient) => ({ mealSlotId: meal.mealSlotId, ingredientId: ingredient.ingredientId })),
  );
  const idResult = checkIngredientIdGuard({
    usedIngredientIds: flattenedOccurrences.map((o) => o.ingredientId),
    validIngredientMaster: context.validIngredientMaster,
    fuzzyMatchMaxDistance: context.fuzzyMatchMaxDistance,
  });

  return { allergenResult, cookTimeResult, diversityResult, idResult, flattenedOccurrences };
}

/**
 * V-05 퍼지 매칭 결과를 draft에 반영한다. 대소문자·공백·오탈자가 fuzzy로 복구됐으면 조용히 고치고,
 * unresolved인 재료가 속한 끼니는 재생성 대상으로 표시한다.
 */
function applyIngredientIdCorrections(
  meals: GeneratedMealDraft[],
  resolutions: IngredientIdResolution[],
): { healedMeals: GeneratedMealDraft[]; unresolvedMealSlotIds: Set<string> } {
  const unresolvedMealSlotIds = new Set<string>();
  let cursor = 0;

  const healedMeals = meals.map((meal) => ({
    ...meal,
    ingredients: meal.ingredients.map((ingredient) => {
      const resolution = resolutions[cursor];
      cursor += 1;

      if (resolution === undefined) {
        return ingredient;
      }
      if (resolution.method === "unresolved") {
        unresolvedMealSlotIds.add(meal.mealSlotId);
        return ingredient;
      }
      if (resolution.method === "fuzzy" && resolution.resolved !== null) {
        return { ...ingredient, ingredientId: resolution.resolved };
      }
      return ingredient;
    }),
  }));

  return { healedMeals, unresolvedMealSlotIds };
}

export function runValidationPipeline(input: RunValidationPipelineInput): RunValidationPipelineResult {
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_REGENERATION_ATTEMPTS;
  let currentMeals = input.meals;
  let regenerationCount = 0;

  let allergenPassed = false;
  let cookTimePassed = false;
  let diversityPassed = false;

  for (;;) {
    const { allergenResult, cookTimeResult, diversityResult, idResult } = evaluateGuards(currentMeals, input.context);

    // V-05 자가 치유는 재시도 여부와 무관하게 항상 반영한다 — 이미 고친 오탈자를 다음 시도에서 잃지 않는다.
    const { healedMeals, unresolvedMealSlotIds } = applyIngredientIdCorrections(currentMeals, idResult.resolutions);
    currentMeals = healedMeals;

    allergenPassed = allergenResult.passed;
    cookTimePassed = cookTimeResult.passed;
    diversityPassed = diversityResult.passed;

    const failingMealSlotIds = new Set<string>([
      ...allergenResult.violations.map((v) => v.mealSlotId),
      ...cookTimeResult.violations.map((v) => v.mealSlotId),
      ...unresolvedMealSlotIds,
    ]);
    const needsFullWeekRegeneration = !diversityPassed;
    const needsRegeneration = needsFullWeekRegeneration || failingMealSlotIds.size > 0;

    if (!needsRegeneration) {
      const inventoryResult = checkInventoryGuard({
        initialQuantities: input.context.initialPantryQuantities,
        usages: buildPantryUsages(currentMeals),
      });

      return {
        status: "passed",
        meals: currentMeals,
        regenerationCount,
        validation: {
          allergen_guard: "passed",
          cook_time_guard: "passed",
          diversity_guard: "passed",
          inventory_guard: "passed",
          regeneration_count: regenerationCount,
        },
        inventory: { correctedUsages: inventoryResult.correctedUsages, ledger: inventoryResult.ledger },
      };
    }

    if (regenerationCount >= maxAttempts) {
      // V-04는 항상 통과하므로, 실패로 끝나더라도 상위 단계(§5 실패 폴백)가 참고할 수 있게 마지막 상태 기준으로 계산해 둔다.
      const inventoryResult = checkInventoryGuard({
        initialQuantities: input.context.initialPantryQuantities,
        usages: buildPantryUsages(currentMeals),
      });

      return {
        status: "failed_after_max_attempts",
        meals: currentMeals,
        regenerationCount,
        validation: {
          allergen_guard: allergenPassed ? "passed" : "failed",
          cook_time_guard: cookTimePassed ? "passed" : "failed",
          diversity_guard: diversityPassed ? "passed" : "failed",
          inventory_guard: "passed",
          regeneration_count: regenerationCount,
        },
        inventory: { correctedUsages: inventoryResult.correctedUsages, ledger: inventoryResult.ledger },
      };
    }

    const mealSlotIdsToRegenerate = needsFullWeekRegeneration
      ? currentMeals.map((m) => m.mealSlotId)
      : [...failingMealSlotIds];

    currentMeals = input.regenerate({
      mealSlotIds: mealSlotIdsToRegenerate,
      attempt: regenerationCount + 1,
      previousMeals: currentMeals,
    });
    regenerationCount += 1;
  }
}
