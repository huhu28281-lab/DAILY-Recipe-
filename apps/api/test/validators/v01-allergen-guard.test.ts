import { describe, expect, it } from "vitest";

import { checkAllergenGuard, type AllergenGuardInput } from "../../src/validators/guards";

// V-01: household_allergens_union에 속한 알레르기 재료는 어떤 끼니에도, 어떤 형태로도 있으면 안 된다.
// 판정은 ingredient_id → allergen_tags 매핑으로만 한다 — 재료명 문자열을 보고 판단하지 않는다.
// "우회하지 않는다"는 규칙이라 이 파일은 특히 "걸러져야 하는" 케이스를 다양하게 확인한다.

describe("V-01 알레르기 가드", () => {
  it("알레르기 재료가 전혀 없으면 통과한다", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["milk", "walnut"],
      ingredientAllergenMap: {
        ING_0301: [], // 양파
        ING_0304: [], // 무
      },
      meals: [{ mealSlotId: "mon_dinner", ingredientIds: ["ING_0301", "ING_0304"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.guardId).toBe("V-01");
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("저녁 끼니에 우유 알레르기 재료(우유)가 있으면 걸러낸다", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["milk"],
      ingredientAllergenMap: {
        ING_0501: ["milk"], // 우유
        ING_0301: [],
      },
      meals: [{ mealSlotId: "mon_dinner", ingredientIds: ["ING_0501", "ING_0301"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toContainEqual({
      mealSlotId: "mon_dinner",
      ingredientId: "ING_0501",
      allergenId: "milk",
    });
  });

  it("아침 끼니 하나에만 알레르기 재료가 있어도 걸러낸다 (끼니 위치와 무관)", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["egg"],
      ingredientAllergenMap: {
        ING_0101: ["egg"], // 계란
        ING_0302: [],
      },
      meals: [
        { mealSlotId: "mon_breakfast", ingredientIds: ["ING_0101"] },
        { mealSlotId: "mon_dinner", ingredientIds: ["ING_0302"] },
      ],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.mealSlotId).toBe("mon_breakfast");
  });

  it("한 재료가 가구의 여러 알레르기와 동시에 겹치면 그만큼 위반 항목을 각각 만든다", () => {
    // 예: 고추장에 대두·밀이 동시에 태그되어 있고 가구가 둘 다 알레르기인 경우.
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["soy", "wheat"],
      ingredientAllergenMap: {
        ING_0516: ["soy", "wheat"], // 고추장
      },
      meals: [{ mealSlotId: "tue_dinner", ingredientIds: ["ING_0516"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations.map((v) => v.allergenId).sort()).toEqual(["soy", "wheat"]);
  });

  it("여러 끼니에 걸쳐 알레르기 재료가 흩어져 있으면 각 끼니를 모두 위반으로 보고한다", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["pork"],
      ingredientAllergenMap: {
        ING_0102: ["pork"], // 돼지고기 앞다리살
        ING_0418: ["pork"], // 냉동 삼겹살
        ING_0301: [],
      },
      meals: [
        { mealSlotId: "mon_dinner", ingredientIds: ["ING_0102"] },
        { mealSlotId: "wed_dinner", ingredientIds: ["ING_0301"] },
        { mealSlotId: "fri_dinner", ingredientIds: ["ING_0418"] },
      ],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    const violatingSlots = result.violations.map((v) => v.mealSlotId).sort();
    expect(violatingSlots).toEqual(["fri_dinner", "mon_dinner"]);
  });

  it("가구 알레르기 유니온이 비어 있으면 무엇을 넣어도 통과한다", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: [],
      ingredientAllergenMap: {
        ING_0101: ["egg"],
        ING_0501: ["milk"],
      },
      meals: [{ mealSlotId: "mon_breakfast", ingredientIds: ["ING_0101", "ING_0501"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(true);
  });

  it("재료명에 알레르기 단어가 들어 있어도 태그가 없으면 걸러내지 않는다 (문자열 매칭 금지)", () => {
    // "새우깡"이라는 이름만 보면 새우 알레르기를 의심할 수 있지만, 실제로는 새우가 들어있지 않을 수도 있다.
    // ingredient_allergen_tags에 shrimp 태그가 없으면 통과해야 한다 — 이름으로 판단하면 안 된다는 걸 보장하는 테스트.
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["shrimp"],
      ingredientAllergenMap: {
        ING_9001: [], // "새우깡" (실제로는 새우 미함유 가정)
      },
      meals: [{ mealSlotId: "sat_lunch", ingredientIds: ["ING_9001"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("이름이 평범해도 가공식품 안에 숨은 알레르기 원료가 태그돼 있으면 걸러낸다 (문자열로는 못 잡는 케이스)", () => {
    // "육수 큐브"라는 이름만 봐서는 밀/대두를 연상하기 어렵지만, 매핑에는 태그돼 있다.
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["wheat"],
      ingredientAllergenMap: {
        ING_9002: ["wheat"], // "육수 큐브" — 이름으로는 밀 성분을 유추할 수 없다.
      },
      meals: [{ mealSlotId: "thu_dinner", ingredientIds: ["ING_9002"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toContainEqual({
      mealSlotId: "thu_dinner",
      ingredientId: "ING_9002",
      allergenId: "wheat",
    });
  });

  it("가구 알레르기 유니온에 없는 알레르기 태그는 무시한다 (관계 없는 알레르기까지 막지 않는다)", () => {
    // 가구는 우유만 알레르기다. 새우 태그가 있는 재료가 들어가도 새우는 유니온에 없으니 통과해야 한다.
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["milk"],
      ingredientAllergenMap: {
        ING_0420: ["shrimp"], // 새우
      },
      meals: [{ mealSlotId: "mon_dinner", ingredientIds: ["ING_0420"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(true);
  });

  it("14끼니 전체를 스캔한다 — 마지막 끼니(일요일 저녁)에만 위반이 있어도 잡아낸다", () => {
    const safeIngredient = "ING_0301";
    const unsafeIngredient = "ING_0801"; // 참깨
    const meals = [
      "mon_breakfast", "mon_dinner",
      "tue_breakfast", "tue_dinner",
      "wed_breakfast", "wed_dinner",
      "thu_breakfast", "thu_dinner",
      "fri_breakfast", "fri_dinner",
      "sat_breakfast", "sat_dinner",
      "sun_breakfast", "sun_dinner",
    ].map((mealSlotId, index) => ({
      mealSlotId,
      ingredientIds: [index === 13 ? unsafeIngredient : safeIngredient],
    }));

    const input: AllergenGuardInput = {
      householdAllergenUnion: ["sesame"],
      ingredientAllergenMap: {
        [safeIngredient]: [],
        [unsafeIngredient]: ["sesame"],
      },
      meals,
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.mealSlotId).toBe("sun_dinner");
  });

  it("매핑에 없는 ingredient_id는 알레르기 태그가 없는 것으로 취급한다 (마스터 미등록 재료는 V-05가 잡을 문제)", () => {
    const input: AllergenGuardInput = {
      householdAllergenUnion: ["egg"],
      ingredientAllergenMap: {},
      meals: [{ mealSlotId: "mon_breakfast", ingredientIds: ["ING_UNKNOWN"] }],
    };

    const result = checkAllergenGuard(input);

    expect(result.passed).toBe(true);
  });
});
