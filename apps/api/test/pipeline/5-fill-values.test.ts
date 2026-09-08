import { describe, expect, it } from "vitest";

import { fillMealValues, type FillValuesContext } from "../../src/pipeline/5-fill-values";
import type { GeneratedMealDraft } from "../../src/pipeline/4-validate";

// [5] 수치 채우기. LLM은 메뉴만 만들고 kcal·가격은 절대 만들지 않는다(§6) — 이 단계가 DB 조회로 채운다.
// amount는 g/ml 기준이라고 가정한다(모듈 상단 주석 참고).

function draft(overrides: Partial<GeneratedMealDraft> & { ingredients: GeneratedMealDraft["ingredients"] }): GeneratedMealDraft {
  return {
    mealSlotId: "mon_dinner",
    mealType: "dinner",
    menuName: "테스트 메뉴",
    cookTimeMin: 35,
    difficulty: "중",
    mainIngredientId: overrides.ingredients[0]?.ingredientId ?? "ING_X",
    ...overrides,
  };
}

function baseContext(overrides: Partial<FillValuesContext> = {}): FillValuesContext {
  return {
    householdSize: 2,
    nutritionByIngredientId: {},
    priceByIngredientId: {},
    isStapleByIngredientId: {},
    ...overrides,
  };
}

describe("5단계 수치 채우기", () => {
  it("여러 재료의 kcal을 합산해 인원수로 나눈 1인분 kcal과, 그 배수인 가구 합계를 만든다", () => {
    const meal = draft({
      ingredients: [
        { ingredientId: "ING_X", amount: 200, declaredSource: "purchase" }, // 200g * 200kcal/100g = 400kcal
        { ingredientId: "ING_Y", amount: 100, declaredSource: "pantry" }, // 100g * 100kcal/100g = 100kcal
      ],
    });

    const context = baseContext({
      householdSize: 2,
      nutritionByIngredientId: {
        ING_X: { kcalPer100g: 200, carbGPer100g: 0, proteinGPer100g: 0, fatGPer100g: 0 },
        ING_Y: { kcalPer100g: 100, carbGPer100g: 0, proteinGPer100g: 0, fatGPer100g: 0 },
      },
    });

    const filled = fillMealValues(meal, context);

    // 총 500kcal / 2인 = 250kcal/인분, 가구 합계는 그 배수(500)여야 한다.
    expect(filled.caloriesPerPerson).toBe(250);
    expect(filled.caloriesHousehold).toBe(500);
    expect(filled.caloriesHousehold).toBe(filled.caloriesPerPerson * context.householdSize);
  });

  it("1인분 kcal을 반올림한 뒤 인원수를 곱하므로, 가구 합계가 원시 총 kcal과 약간 달라질 수 있다", () => {
    const meal = draft({
      ingredients: [{ ingredientId: "ING_X", amount: 100, declaredSource: "pantry" }], // 100kcal
    });
    const context = baseContext({
      householdSize: 3,
      nutritionByIngredientId: { ING_X: { kcalPer100g: 100, carbGPer100g: 0, proteinGPer100g: 0, fatGPer100g: 0 } },
    });

    const filled = fillMealValues(meal, context);

    expect(filled.caloriesPerPerson).toBe(33); // round(100/3)
    expect(filled.caloriesHousehold).toBe(99); // 33 * 3, 원시 총합 100이 아니다
  });

  it("구매 재료만 meal_extra_cost에 들어가고, 보유 재료는 meal_total_cost에만 반영된다", () => {
    const meal = draft({
      ingredients: [
        { ingredientId: "ING_X", amount: 200, declaredSource: "purchase" }, // 200g * 10원/g = 2000원
        { ingredientId: "ING_Y", amount: 100, declaredSource: "pantry" }, // 100g * 5원/g = 500원
      ],
    });
    const context = baseContext({
      priceByIngredientId: {
        ING_X: { packageQuantity: 500, packagePriceKrw: 5000, priceSource: "KAMIS" }, // 10원/g
        ING_Y: { packageQuantity: 200, packagePriceKrw: 1000, priceSource: "KAMIS" }, // 5원/g
      },
    });

    const filled = fillMealValues(meal, context);

    expect(filled.mealExtraCostKrw).toBe(2000); // 구매(ING_X)만
    expect(filled.mealTotalCostKrw).toBe(2500); // 구매 + 보유(ING_X + ING_Y)
  });

  it("양념(is_staple)은 비용과 냉장고 활용 지표 분모에서 제외되지만 kcal 계산에는 포함된다", () => {
    const meal = draft({
      ingredients: [
        { ingredientId: "ING_X", amount: 100, declaredSource: "purchase" }, // 비양념
        { ingredientId: "ING_SALT", amount: 10, declaredSource: "pantry" }, // 양념
      ],
    });
    const context = baseContext({
      nutritionByIngredientId: {
        ING_X: { kcalPer100g: 100, carbGPer100g: 0, proteinGPer100g: 0, fatGPer100g: 0 }, // 100kcal
        ING_SALT: { kcalPer100g: 50, carbGPer100g: 0, proteinGPer100g: 0, fatGPer100g: 0 }, // 5kcal
      },
      priceByIngredientId: {
        ING_X: { packageQuantity: 100, packagePriceKrw: 1000, priceSource: "KAMIS" }, // 10원/g
        ING_SALT: { packageQuantity: 1000, packagePriceKrw: 2000, priceSource: "KAMIS" }, // 2원/g
      },
      isStapleByIngredientId: { ING_SALT: true },
      householdSize: 1,
    });

    const filled = fillMealValues(meal, context);

    expect(filled.caloriesPerPerson).toBe(105); // 100 + 5, 양념도 kcal에는 포함
    expect(filled.mealExtraCostKrw).toBe(1000); // 소금 비용(20원)은 제외
    expect(filled.mealTotalCostKrw).toBe(1000);
    expect(filled.mealCoverageRate).toBe(0); // 비양념(ING_X)만 분모, 그건 구매라 0%
  });

  it("가격 미확인 재료가 있으면 has_unpriced_ingredient를 표시하고 그 재료는 비용에서 빠진다", () => {
    const meal = draft({
      ingredients: [
        { ingredientId: "ING_X", amount: 100, declaredSource: "purchase" }, // 가격 있음: 1000원
        { ingredientId: "ING_UNPRICED", amount: 50, declaredSource: "purchase" }, // 가격 없음
      ],
    });
    const context = baseContext({
      priceByIngredientId: {
        ING_X: { packageQuantity: 100, packagePriceKrw: 1000, priceSource: "KAMIS" },
        ING_UNPRICED: { packageQuantity: null, packagePriceKrw: null, priceSource: "unavailable" },
      },
    });

    const filled = fillMealValues(meal, context);

    expect(filled.hasUnpricedIngredient).toBe(true);
    expect(filled.mealExtraCostKrw).toBe(1000); // 가격 있는 재료만 반영
  });

  it("모든 비양념 재료가 보유 재료면 냉장고 활용률이 1이다 (집에 있는 재료로 100% 배지 조건)", () => {
    const meal = draft({
      ingredients: [
        { ingredientId: "ING_X", amount: 100, declaredSource: "pantry" },
        { ingredientId: "ING_Y", amount: 50, declaredSource: "pantry" },
      ],
    });

    const filled = fillMealValues(meal, baseContext());

    expect(filled.mealCoverageRate).toBe(1);
    expect(filled.mealExtraCostKrw).toBe(0);
  });

  it("모든 재료가 양념이면(비양념 재료가 없으면) 활용률은 1로, 비용은 0으로 취급한다", () => {
    const meal = draft({
      ingredients: [{ ingredientId: "ING_SALT", amount: 5, declaredSource: "pantry" }],
    });
    const context = baseContext({ isStapleByIngredientId: { ING_SALT: true } });

    const filled = fillMealValues(meal, context);

    expect(filled.mealCoverageRate).toBe(1);
    expect(filled.mealExtraCostKrw).toBe(0);
    expect(filled.mealTotalCostKrw).toBe(0);
  });

  it("비용은 백 원 단위로 반올림한다", () => {
    const meal = draft({
      ingredients: [{ ingredientId: "ING_X", amount: 150, declaredSource: "purchase" }],
    });
    const context = baseContext({
      // 단가 = 1000/350 = 2.857...원/g, 150g = 428.57...원 → 반올림하면 400원
      priceByIngredientId: { ING_X: { packageQuantity: 350, packagePriceKrw: 1000, priceSource: "aT" } },
    });

    const filled = fillMealValues(meal, context);

    expect(filled.mealExtraCostKrw).toBe(400);
  });

  it("재료별 결과에도 단가·추가비용을 남겨 감사(audit)할 수 있게 한다", () => {
    const meal = draft({
      ingredients: [{ ingredientId: "ING_X", amount: 200, declaredSource: "purchase" }],
    });
    const context = baseContext({
      priceByIngredientId: { ING_X: { packageQuantity: 500, packagePriceKrw: 5000, priceSource: "KAMIS" } },
    });

    const filled = fillMealValues(meal, context);

    expect(filled.ingredients).toEqual([
      { ingredientId: "ING_X", amount: 200, source: "purchase", unitPriceKrw: 10, extraCostKrw: 2000 },
    ]);
  });

  it("영양·가격 정보가 아예 없는 재료는 0으로 취급하고 예외를 던지지 않는다", () => {
    const meal = draft({
      ingredients: [{ ingredientId: "ING_UNKNOWN", amount: 100, declaredSource: "purchase" }],
    });

    const filled = fillMealValues(meal, baseContext());

    expect(filled.caloriesPerPerson).toBe(0);
    expect(filled.hasUnpricedIngredient).toBe(true);
    expect(filled.mealExtraCostKrw).toBe(0);
  });
});
