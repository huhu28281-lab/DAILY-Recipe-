import { describe, expect, it } from "vitest";

import { checkCookTimeGuard, type CookTimeGuardInput } from "../../src/validators/guards";

// V-02: 아침 ≤15분, 저녁은 30분 이상 40분 이하 (§6 Absolute Constraints #4로 하한도 게이트에 포함).

describe("V-02 조리시간 가드", () => {
  it("아침 15분, 저녁 35분이면 통과한다", () => {
    const input: CookTimeGuardInput = {
      meals: [
        { mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 15 },
        { mealSlotId: "mon_dinner", mealType: "dinner", cookTimeMin: 35 },
      ],
    };

    const result = checkCookTimeGuard(input);

    expect(result.guardId).toBe("V-02");
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("아침이 16분이면 걸러낸다", () => {
    const input: CookTimeGuardInput = {
      meals: [{ mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 16 }],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ mealSlotId: "mon_breakfast", cookTimeMin: 16 }),
    );
  });

  it("저녁이 29분이면 (하한 미달) 걸러낸다", () => {
    const input: CookTimeGuardInput = {
      meals: [{ mealSlotId: "mon_dinner", mealType: "dinner", cookTimeMin: 29 }],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it("저녁이 41분이면 (상한 초과) 걸러낸다", () => {
    const input: CookTimeGuardInput = {
      meals: [{ mealSlotId: "mon_dinner", mealType: "dinner", cookTimeMin: 41 }],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(false);
  });

  it("저녁 경계값 30분과 40분은 각각 통과한다", () => {
    const input: CookTimeGuardInput = {
      meals: [
        { mealSlotId: "mon_dinner", mealType: "dinner", cookTimeMin: 30 },
        { mealSlotId: "tue_dinner", mealType: "dinner", cookTimeMin: 40 },
      ],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(true);
  });

  it("아침 경계값 15분은 통과, 0분 이하 같은 비정상 값은 걸러낸다", () => {
    const input: CookTimeGuardInput = {
      meals: [
        { mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 15 },
        { mealSlotId: "tue_breakfast", mealType: "breakfast", cookTimeMin: 0 },
      ],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.mealSlotId)).toEqual(["tue_breakfast"]);
  });

  it("주말 점심(lunch)은 시간 상한이 명세에 없어 검사 대상이 아니다", () => {
    const input: CookTimeGuardInput = {
      meals: [{ mealSlotId: "sat_lunch", mealType: "lunch", cookTimeMin: 90 }],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("여러 끼니 중 일부만 위반해도 위반 목록에는 그 끼니만 담긴다", () => {
    const input: CookTimeGuardInput = {
      meals: [
        { mealSlotId: "mon_breakfast", mealType: "breakfast", cookTimeMin: 10 },
        { mealSlotId: "mon_dinner", mealType: "dinner", cookTimeMin: 45 }, // 위반
        { mealSlotId: "tue_breakfast", mealType: "breakfast", cookTimeMin: 20 }, // 위반
        { mealSlotId: "tue_dinner", mealType: "dinner", cookTimeMin: 35 },
      ],
    };

    const result = checkCookTimeGuard(input);

    expect(result.passed).toBe(false);
    expect(result.violations.map((v) => v.mealSlotId).sort()).toEqual(["mon_dinner", "tue_breakfast"]);
  });
});
