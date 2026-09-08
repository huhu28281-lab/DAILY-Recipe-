import { describe, expect, it } from "vitest";

import { checkIngredientIdGuard, type IngredientIdGuardInput, type IngredientMasterRef } from "../../src/validators/guards";

// V-05: 모든 재료는 유효한 ingredient_id를 가져야 한다. 정확히 일치하지 않으면 퍼지 매칭으로 복구를 시도하고,
// 그래도 못 찾으면 가드가 실패해 재생성을 유발한다.

const master: IngredientMasterRef[] = [
  { ingredientId: "ING_0101", name: "계란" },
  { ingredientId: "ING_0402", name: "소고기 국거리" },
  { ingredientId: "ING_0207", name: "두부" },
];

describe("V-05 ingredient_id 유효성 가드", () => {
  it("모두 정확히 일치하면 통과하고 전부 exact로 표시한다", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["ING_0101", "ING_0402"],
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.guardId).toBe("V-05");
    expect(result.passed).toBe(true);
    expect(result.resolutions).toEqual([
      { original: "ING_0101", resolved: "ING_0101", method: "exact" },
      { original: "ING_0402", resolved: "ING_0402", method: "exact" },
    ]);
  });

  it("대소문자·공백 차이는 퍼지 매칭으로 복구해 통과시킨다", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: [" ing_0101 ", "ing_0402"],
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.passed).toBe(true);
    expect(result.resolutions).toContainEqual({ original: " ing_0101 ", resolved: "ING_0101", method: "fuzzy" });
    expect(result.resolutions).toContainEqual({ original: "ing_0402", resolved: "ING_0402", method: "fuzzy" });
  });

  it("한 글자 오탈자는 퍼지 매칭으로 복구한다 (숫자 0을 알파벳 O로 잘못 쓴 경우)", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["ING_04O2"], // 0 → O
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.passed).toBe(true);
    expect(result.resolutions[0]).toEqual({ original: "ING_04O2", resolved: "ING_0402", method: "fuzzy" });
  });

  it("id 대신 재료명을 그대로 출력해도 이름으로 매칭해 복구한다", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["소고기 국거리"],
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.passed).toBe(true);
    expect(result.resolutions[0]).toEqual({ original: "소고기 국거리", resolved: "ING_0402", method: "fuzzy" });
  });

  it("마스터에 전혀 없는 id는 근접 후보를 못 찾으면 실패로 남기고 전체 가드도 실패한다", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["ING_0101", "XYZ_9999"],
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.passed).toBe(false);
    expect(result.resolutions).toContainEqual({ original: "XYZ_9999", resolved: null, method: "unresolved" });
    // 나머지 정상 항목은 그대로 exact로 남아 있어야, 어떤 게 문제인지 구분할 수 있다.
    expect(result.resolutions).toContainEqual({ original: "ING_0101", resolved: "ING_0101", method: "exact" });
  });

  it("fuzzyMatchMaxDistance를 좁게 주면 사소한 오탈자도 복구하지 못하고 unresolved로 남는다", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["ING_04O2"], // 0 → O, 편집거리 1
      validIngredientMaster: master,
      fuzzyMatchMaxDistance: 0, // 정확히 일치하는 것만 허용
    };

    const result = checkIngredientIdGuard(input);

    expect(result.passed).toBe(false);
    expect(result.resolutions[0]?.method).toBe("unresolved");
  });

  it("빈 목록이면 아무 위반 없이 통과한다", () => {
    const result = checkIngredientIdGuard({ usedIngredientIds: [], validIngredientMaster: master });

    expect(result.passed).toBe(true);
    expect(result.resolutions).toEqual([]);
  });

  it("같은 id가 여러 끼니에서 반복돼도 각각 독립적으로 판정한다 (입력 순서 보존)", () => {
    const input: IngredientIdGuardInput = {
      usedIngredientIds: ["ING_0101", "ING_0101", "XYZ_9999"],
      validIngredientMaster: master,
    };

    const result = checkIngredientIdGuard(input);

    expect(result.resolutions).toHaveLength(3);
    expect(result.resolutions.map((r) => r.method)).toEqual(["exact", "exact", "unresolved"]);
  });
});
