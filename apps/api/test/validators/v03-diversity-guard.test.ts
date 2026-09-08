import { describe, expect, it } from "vitest";

import { checkDiversityGuard, type MealForDiversityCheck } from "../../src/validators/guards";

// V-03: 연속 3끼니 이상 동일 주재료 금지 · 이번 주 내 동일 메뉴 중복 금지 · 최근 4주 이력 중복률 ≤30%.
// orderedMeals는 슬롯 시간 순서(월아침→월저녁→화아침...)로 넣어야 "연속" 판정이 의미가 있다.

function meal(mealSlotId: string, menuName: string, mainIngredientId: string): MealForDiversityCheck {
  return { mealSlotId, menuName, mainIngredientId };
}

describe("V-03 다양성 가드", () => {
  it("주재료도 메뉴도 안 겹치고 이력 중복도 없으면 통과한다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "계란 야채죽", "ING_0101"),
        meal("mon_dinner", "소고기 뭇국", "ING_0402"),
        meal("tue_breakfast", "두부 스크램블", "ING_0207"),
        meal("tue_dinner", "닭볶음탕", "ING_0103"),
      ],
      recentMenuNamesLast4Weeks: ["김치찌개", "된장찌개"],
    });

    expect(result.guardId).toBe("V-03");
    expect(result.passed).toBe(true);
    expect(result.consecutiveMainIngredientViolations).toEqual([]);
    expect(result.duplicateMenuNamesInWeek).toEqual([]);
  });

  it("같은 주재료가 연속 3끼니 나오면 걸러낸다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "닭죽", "ING_0103"),
        meal("mon_dinner", "닭볶음탕", "ING_0103"),
        meal("tue_breakfast", "닭가슴살 샐러드", "ING_0103"),
        meal("tue_dinner", "소고기 뭇국", "ING_0402"),
      ],
      recentMenuNamesLast4Weeks: [],
    });

    expect(result.passed).toBe(false);
    expect(result.consecutiveMainIngredientViolations).toHaveLength(1);
    expect(result.consecutiveMainIngredientViolations[0]).toEqual({
      mealSlotIds: ["mon_breakfast", "mon_dinner", "tue_breakfast"],
      ingredientId: "ING_0103",
    });
  });

  it("같은 주재료가 정확히 2끼니 연속인 건 허용한다 (3끼니부터 위반)", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "닭죽", "ING_0103"),
        meal("mon_dinner", "닭볶음탕", "ING_0103"),
        meal("tue_breakfast", "두부 스크램블", "ING_0207"),
      ],
      recentMenuNamesLast4Weeks: [],
    });

    expect(result.passed).toBe(true);
    expect(result.consecutiveMainIngredientViolations).toEqual([]);
  });

  it("같은 주재료가 떨어져서(연속이 아니게) 나오면 위반이 아니다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "닭죽", "ING_0103"),
        meal("mon_dinner", "소고기 뭇국", "ING_0402"),
        meal("tue_breakfast", "두부 스크램블", "ING_0207"),
        meal("tue_dinner", "닭볶음탕", "ING_0103"),
      ],
      recentMenuNamesLast4Weeks: [],
    });

    expect(result.passed).toBe(true);
  });

  it("연속 4끼니 이상 겹치면 하나의 위반으로 전체 구간을 보고한다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "돼지고기 김치볶음", "ING_0102"),
        meal("mon_dinner", "돼지고기 두루치기", "ING_0102"),
        meal("tue_breakfast", "돼지고기 볶음밥", "ING_0102"),
        meal("tue_dinner", "돼지고기 김치찌개", "ING_0102"),
        meal("wed_breakfast", "두부 스크램블", "ING_0207"),
      ],
      recentMenuNamesLast4Weeks: [],
    });

    expect(result.passed).toBe(false);
    expect(result.consecutiveMainIngredientViolations).toHaveLength(1);
    expect(result.consecutiveMainIngredientViolations[0]?.mealSlotIds).toEqual([
      "mon_breakfast",
      "mon_dinner",
      "tue_breakfast",
      "tue_dinner",
    ]);
  });

  it("같은 주에 동일 메뉴명이 두 번 나오면 걸러낸다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_dinner", "소고기 뭇국", "ING_0402"),
        meal("thu_dinner", "소고기 뭇국", "ING_0402"),
      ],
      recentMenuNamesLast4Weeks: [],
    });

    expect(result.passed).toBe(false);
    expect(result.duplicateMenuNamesInWeek).toEqual(["소고기 뭇국"]);
  });

  it("최근 4주 이력과 겹치는 비율이 정확히 30%면 통과한다 (경계값 포함)", () => {
    const orderedMeals = [
      meal("s1", "메뉴A", "ING_01"),
      meal("s2", "메뉴B", "ING_02"),
      meal("s3", "메뉴C", "ING_03"),
      meal("s4", "메뉴D", "ING_04"), // 이력과 겹침 1
      meal("s5", "메뉴E", "ING_05"), // 이력과 겹침 2
      meal("s6", "메뉴F", "ING_06"), // 이력과 겹침 3
      meal("s7", "메뉴G", "ING_07"),
      meal("s8", "메뉴H", "ING_08"),
      meal("s9", "메뉴I", "ING_09"),
      meal("s10", "메뉴J", "ING_10"),
    ];

    const result = checkDiversityGuard({
      orderedMeals,
      recentMenuNamesLast4Weeks: ["메뉴D", "메뉴E", "메뉴F"], // 3/10 = 30%
    });

    expect(result.historyDuplicateRate).toBeCloseTo(0.3);
    expect(result.historyDuplicateRateExceeded).toBe(false);
    expect(result.passed).toBe(true);
  });

  it("최근 4주 이력과 겹치는 비율이 30%를 넘으면 걸러낸다", () => {
    const orderedMeals = [
      meal("s1", "메뉴A", "ING_01"),
      meal("s2", "메뉴B", "ING_02"),
      meal("s3", "메뉴C", "ING_03"),
      meal("s4", "메뉴D", "ING_04"),
      meal("s5", "메뉴E", "ING_05"),
      meal("s6", "메뉴F", "ING_06"),
      meal("s7", "메뉴G", "ING_07"),
      meal("s8", "메뉴H", "ING_08"),
      meal("s9", "메뉴I", "ING_09"),
      meal("s10", "메뉴J", "ING_10"),
    ];

    const result = checkDiversityGuard({
      orderedMeals,
      recentMenuNamesLast4Weeks: ["메뉴D", "메뉴E", "메뉴F", "메뉴G"], // 4/10 = 40%
    });

    expect(result.historyDuplicateRate).toBeCloseTo(0.4);
    expect(result.historyDuplicateRateExceeded).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("세 규칙 중 하나만 위반해도 전체 가드는 실패한다", () => {
    const result = checkDiversityGuard({
      orderedMeals: [
        meal("mon_breakfast", "메뉴A", "ING_01"),
        meal("mon_dinner", "메뉴B", "ING_02"),
      ],
      recentMenuNamesLast4Weeks: ["메뉴A", "메뉴B", "메뉴C", "메뉴D"], // 2/2 = 100% > 30%
    });

    expect(result.passed).toBe(false);
    expect(result.consecutiveMainIngredientViolations).toEqual([]);
    expect(result.duplicateMenuNamesInWeek).toEqual([]);
    expect(result.historyDuplicateRateExceeded).toBe(true);
  });
});
