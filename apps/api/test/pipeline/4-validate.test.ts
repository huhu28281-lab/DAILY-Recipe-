import { describe, expect, it, vi } from "vitest";

import {
  runValidationPipeline,
  type GeneratedMealDraft,
  type ValidationContext,
} from "../../src/pipeline/4-validate";

// 검증 가드 오케스트레이션. 명세 §5 "[4] 검증 가드 — 실패 시 [3] 재호출, 최대 3회".
// 실제 LLM 재호출은 흉내내는 vi.fn()으로 대체하고, 오케스트레이션 로직(어떤 끼니를 왜 다시 만드는지,
// 몇 번까지 시도하는지)만 검증한다.

const master = [
  { ingredientId: "ING_A", name: "재료A" },
  { ingredientId: "ING_B", name: "재료B" },
  { ingredientId: "ING_C", name: "재료C" },
];

function baseContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    householdAllergenUnion: [],
    ingredientAllergenMap: {},
    recentMenuNamesLast4Weeks: [],
    initialPantryQuantities: {},
    validIngredientMaster: master,
    ...overrides,
  };
}

function meal(overrides: Partial<GeneratedMealDraft> & { mealSlotId: string }): GeneratedMealDraft {
  return {
    mealType: "dinner",
    menuName: `메뉴-${overrides.mealSlotId}`,
    cookTimeMin: 35,
    difficulty: "중",
    mainIngredientId: "ING_A",
    ingredients: [{ ingredientId: "ING_A", amount: 1, declaredSource: "purchase" }],
    ...overrides,
  };
}

describe("4단계 검증 가드 파이프라인", () => {
  it("모든 가드를 첫 시도에 통과하면 재생성 없이 끝난다", () => {
    const regenerate = vi.fn();
    const meals = [
      meal({ mealSlotId: "mon_dinner" }),
      meal({
        mealSlotId: "tue_dinner",
        mainIngredientId: "ING_B",
        ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }],
      }),
    ];

    const result = runValidationPipeline({ meals, context: baseContext(), regenerate });

    expect(result.status).toBe("passed");
    expect(result.regenerationCount).toBe(0);
    expect(result.validation).toEqual({
      allergen_guard: "passed",
      cook_time_guard: "passed",
      diversity_guard: "passed",
      inventory_guard: "passed",
      regeneration_count: 0,
    });
    expect(regenerate).not.toHaveBeenCalled();
  });

  it("알레르기 위반이 있으면 그 끼니만 재생성 대상으로 넘기고, 고쳐지면 통과한다", () => {
    const badMeal = meal({ mealSlotId: "mon_dinner" }); // ING_A = 알레르기 재료
    const okMeal = meal({
      mealSlotId: "tue_dinner",
      mainIngredientId: "ING_B",
      ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }],
    });
    const fixedMeal = meal({
      mealSlotId: "mon_dinner",
      mainIngredientId: "ING_C",
      ingredients: [{ ingredientId: "ING_C", amount: 1, declaredSource: "purchase" }],
    });

    const regenerate = vi.fn().mockReturnValue([fixedMeal, okMeal]);

    const result = runValidationPipeline({
      meals: [badMeal, okMeal],
      context: baseContext({ householdAllergenUnion: ["egg"], ingredientAllergenMap: { ING_A: ["egg"] } }),
      regenerate,
    });

    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(regenerate).toHaveBeenCalledWith({
      mealSlotIds: ["mon_dinner"],
      attempt: 1,
      previousMeals: [badMeal, okMeal],
    });
    expect(result.status).toBe("passed");
    expect(result.regenerationCount).toBe(1);
    expect(result.meals).toEqual([fixedMeal, okMeal]);
  });

  it("조리시간 위반도 그 끼니만 재생성 대상으로 넘긴다", () => {
    const badMeal = meal({ mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 25 }); // 아침 15분 초과
    const okMeal = meal({ mealSlotId: "tue_dinner" });
    const fixedMeal = meal({ mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 10 });

    const regenerate = vi.fn().mockReturnValue([fixedMeal, okMeal]);

    const result = runValidationPipeline({ meals: [badMeal, okMeal], context: baseContext(), regenerate });

    expect(regenerate).toHaveBeenCalledWith({
      mealSlotIds: ["mon_breakfast"],
      attempt: 1,
      previousMeals: [badMeal, okMeal],
    });
    expect(result.status).toBe("passed");
  });

  it("한 시도에 여러 끼니가 동시에 위반해도 재생성 호출은 한 번만, 대상은 합쳐서 넘긴다", () => {
    const allergenBad = meal({ mealSlotId: "mon_dinner" }); // 기본 ING_A = 알레르기 재료
    const cookTimeBad = meal({
      mealSlotId: "tue_breakfast",
      mealType: "breakfast",
      cookTimeMin: 30,
      mainIngredientId: "ING_B", // 알레르기와는 무관한 재료로 분리 — 조리시간 위반만 순수하게 테스트
      ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }],
    });
    const okMeal = meal({
      mealSlotId: "wed_dinner",
      mainIngredientId: "ING_B",
      ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }],
    });
    const fixedAllergen = meal({
      mealSlotId: "mon_dinner",
      mainIngredientId: "ING_C",
      ingredients: [{ ingredientId: "ING_C", amount: 1, declaredSource: "purchase" }],
    });
    const fixedCookTime = meal({
      mealSlotId: "tue_breakfast",
      mealType: "breakfast",
      cookTimeMin: 10,
      mainIngredientId: "ING_B",
      ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }],
    });

    const regenerate = vi.fn().mockReturnValue([fixedAllergen, fixedCookTime, okMeal]);

    const result = runValidationPipeline({
      meals: [allergenBad, cookTimeBad, okMeal],
      context: baseContext({ householdAllergenUnion: ["egg"], ingredientAllergenMap: { ING_A: ["egg"] } }),
      regenerate,
    });

    expect(regenerate).toHaveBeenCalledTimes(1);
    const call = regenerate.mock.calls[0]?.[0];
    expect(new Set(call?.mealSlotIds)).toEqual(new Set(["mon_dinner", "tue_breakfast"]));
    expect(result.status).toBe("passed");
    expect(result.regenerationCount).toBe(1);
  });

  it("id 오탈자는 재생성 없이 그 자리에서 조용히 고친다 (V-05 자가 치유)", () => {
    const typoMeal = meal({
      mealSlotId: "mon_dinner",
      ingredients: [{ ingredientId: "ing_a", amount: 1, declaredSource: "purchase" }], // 대소문자만 다름
    });

    const regenerate = vi.fn();
    const result = runValidationPipeline({ meals: [typoMeal], context: baseContext(), regenerate });

    expect(regenerate).not.toHaveBeenCalled();
    expect(result.status).toBe("passed");
    expect(result.meals[0]?.ingredients[0]?.ingredientId).toBe("ING_A");
  });

  it("퍼지 매칭으로도 못 찾는 id는 그 끼니를 재생성 대상으로 넘긴다", () => {
    const badMeal = meal({
      mealSlotId: "mon_dinner",
      ingredients: [{ ingredientId: "ZZZ_9999_NO_MATCH", amount: 1, declaredSource: "purchase" }],
    });
    const fixedMeal = meal({ mealSlotId: "mon_dinner" });

    const regenerate = vi.fn().mockReturnValue([fixedMeal]);
    const result = runValidationPipeline({ meals: [badMeal], context: baseContext(), regenerate });

    expect(regenerate).toHaveBeenCalledWith({
      mealSlotIds: ["mon_dinner"],
      attempt: 1,
      previousMeals: [badMeal],
    });
    expect(result.status).toBe("passed");
  });

  it("다양성 위반(V-03)은 끼니 하나가 아니라 이번 주 전체를 재생성 대상으로 넘긴다", () => {
    const meals = [
      meal({ mealSlotId: "mon_breakfast", mainIngredientId: "ING_A" }),
      meal({ mealSlotId: "mon_dinner", mainIngredientId: "ING_A" }),
      meal({ mealSlotId: "tue_breakfast", mainIngredientId: "ING_A" }), // 연속 3끼니 동일 주재료
    ];
    const fixedMeals = [
      meal({ mealSlotId: "mon_breakfast", mainIngredientId: "ING_A" }),
      meal({ mealSlotId: "mon_dinner", mainIngredientId: "ING_B", ingredients: [{ ingredientId: "ING_B", amount: 1, declaredSource: "purchase" }] }),
      meal({ mealSlotId: "tue_breakfast", mainIngredientId: "ING_C", ingredients: [{ ingredientId: "ING_C", amount: 1, declaredSource: "purchase" }] }),
    ];

    const regenerate = vi.fn().mockReturnValue(fixedMeals);
    const result = runValidationPipeline({ meals, context: baseContext(), regenerate });

    expect(regenerate).toHaveBeenCalledWith({
      mealSlotIds: ["mon_breakfast", "mon_dinner", "tue_breakfast"],
      attempt: 1,
      previousMeals: meals,
    });
    expect(result.status).toBe("passed");
  });

  it("최대 시도 횟수(기본 3회)를 넘기면 실패로 끝내고 마지막 상태를 그대로 반환한다", () => {
    const alwaysBad = meal({ mealSlotId: "mon_dinner" }); // 알레르기 위반이 계속 유지된다고 가정

    const regenerate = vi.fn().mockReturnValue([alwaysBad]);

    const result = runValidationPipeline({
      meals: [alwaysBad],
      context: baseContext({ householdAllergenUnion: ["egg"], ingredientAllergenMap: { ING_A: ["egg"] } }),
      regenerate,
    });

    expect(regenerate).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("failed_after_max_attempts");
    expect(result.regenerationCount).toBe(3);
    expect(result.validation.allergen_guard).toBe("failed");
    expect(result.validation.regeneration_count).toBe(3);
  });

  it("maxAttempts를 좁게 주면 그 횟수만큼만 시도하고 포기한다", () => {
    const alwaysBad = meal({ mealSlotId: "mon_dinner" });
    const regenerate = vi.fn().mockReturnValue([alwaysBad]);

    const result = runValidationPipeline({
      meals: [alwaysBad],
      context: baseContext({ householdAllergenUnion: ["egg"], ingredientAllergenMap: { ING_A: ["egg"] } }),
      regenerate,
      maxAttempts: 1,
    });

    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("failed_after_max_attempts");
    expect(result.regenerationCount).toBe(1);
  });

  it("V-04(재고)는 재생성을 유발하지 않는다 — 보유량을 초과해도 보정만 하고 그대로 통과시킨다", () => {
    const meals = [
      meal({
        mealSlotId: "mon_dinner",
        mainIngredientId: "ING_B",
        ingredients: [{ ingredientId: "ING_B", amount: 5, declaredSource: "pantry" }],
      }),
    ];

    const regenerate = vi.fn();
    const result = runValidationPipeline({
      meals,
      context: baseContext({ initialPantryQuantities: { ING_B: 2 } }), // 5개 요청했는데 2개뿐
      regenerate,
    });

    expect(regenerate).not.toHaveBeenCalled();
    expect(result.status).toBe("passed");
    expect(result.regenerationCount).toBe(0);
    expect(result.inventory.correctedUsages).toHaveLength(1);
    expect(result.inventory.correctedUsages[0]).toMatchObject({
      mealSlotId: "mon_dinner",
      ingredientId: "ING_B",
      resolvedSource: "purchase",
    });
  });

  it("빈 끼니 목록이면 재생성 없이 즉시 통과한다", () => {
    const regenerate = vi.fn();
    const result = runValidationPipeline({ meals: [], context: baseContext(), regenerate });

    expect(result.status).toBe("passed");
    expect(result.meals).toEqual([]);
    expect(regenerate).not.toHaveBeenCalled();
  });
});
