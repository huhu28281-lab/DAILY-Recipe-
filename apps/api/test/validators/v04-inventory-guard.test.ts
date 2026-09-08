import { describe, expect, it } from "vitest";

import { checkInventoryGuard, type InventoryGuardInput } from "../../src/validators/guards";

// V-04: 재고 잔량은 음수가 될 수 없다. 다른 가드와 달리 실패해도 "재생성"하지 않고
// 초과분을 purchase로 전환한 뒤 통과시킨다 — 그래서 이 가드의 passed는 항상 true다.

describe("V-04 재고 원장 가드", () => {
  it("보유량 안에서 나눠 쓰면 그대로 pantry로 소진되고 최종 잔량이 맞는다 (명세 §4.2 두부 예시)", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0207: 1 }, // 두부 1모
      usages: [
        { mealSlotId: "mon_dinner", ingredientId: "ING_0207", amount: 0.5, declaredSource: "pantry" },
        { mealSlotId: "wed_breakfast", ingredientId: "ING_0207", amount: 0.5, declaredSource: "pantry" },
      ],
    };

    const result = checkInventoryGuard(input);

    expect(result.guardId).toBe("V-04");
    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toEqual([]);

    const ledgerEntry = result.ledger.find((e) => e.ingredientId === "ING_0207");
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry?.consumption).toEqual([
      { mealSlotId: "mon_dinner", amount: 0.5, remaining: 0.5 },
      { mealSlotId: "wed_breakfast", amount: 0.5, remaining: 0 },
    ]);
    expect(ledgerEntry?.finalRemaining).toBe(0);
  });

  it("두 번째 사용이 남은 잔량을 초과하면 그 건을 purchase로 전환하고 잔량은 그대로 둔다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0101: 10 }, // 계란 10알
      usages: [
        { mealSlotId: "mon_breakfast", ingredientId: "ING_0101", amount: 6, declaredSource: "pantry" },
        { mealSlotId: "wed_breakfast", ingredientId: "ING_0101", amount: 6, declaredSource: "pantry" }, // 남은 4개뿐
      ],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true); // 이 가드는 보정 후 항상 통과한다
    expect(result.correctedUsages).toHaveLength(1);
    expect(result.correctedUsages[0]).toMatchObject({
      mealSlotId: "wed_breakfast",
      ingredientId: "ING_0101",
      declaredSource: "pantry",
      resolvedSource: "purchase",
    });

    const ledgerEntry = result.ledger.find((e) => e.ingredientId === "ING_0101");
    // 보정된 사용은 실제로 재고를 소진하지 않았으므로 consumption 기록에 남지 않는다.
    expect(ledgerEntry?.consumption).toEqual([{ mealSlotId: "mon_breakfast", amount: 6, remaining: 4 }]);
    expect(ledgerEntry?.finalRemaining).toBe(4);
    expect(ledgerEntry?.finalRemaining).toBeGreaterThanOrEqual(0);
  });

  it("처음부터 purchase로 선언된 사용은 재고를 건드리지 않는다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0402: 0 }, // 소고기 국거리, 보유 없음
      usages: [{ mealSlotId: "mon_dinner", ingredientId: "ING_0402", amount: 400, declaredSource: "purchase" }],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toEqual([]); // 애초에 purchase였으니 보정할 것도 없다

    const ledgerEntry = result.ledger.find((e) => e.ingredientId === "ING_0402");
    expect(ledgerEntry?.consumption).toEqual([]);
    expect(ledgerEntry?.finalRemaining).toBe(0);
  });

  it("보유량이 0인데 pantry로 선언되면 첫 사용부터 즉시 purchase로 보정한다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0420: 0 }, // 새우, 보유 없음
      usages: [{ mealSlotId: "mon_dinner", ingredientId: "ING_0420", amount: 100, declaredSource: "pantry" }],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toHaveLength(1);
    expect(result.correctedUsages[0]?.resolvedSource).toBe("purchase");
  });

  it("initialQuantities에 없는(보유하지 않는) 재료를 구매로 쓰면 원장에 없어도 된다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: {},
      usages: [{ mealSlotId: "mon_dinner", ingredientId: "ING_0999", amount: 1, declaredSource: "purchase" }],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toEqual([]);
    expect(result.ledger.find((e) => e.ingredientId === "ING_0999")).toBeUndefined();
  });

  it("여러 재료를 동시에 추적하고 서로의 잔량 계산에 영향을 주지 않는다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0101: 10, ING_0207: 1 },
      usages: [
        { mealSlotId: "mon_breakfast", ingredientId: "ING_0101", amount: 2, declaredSource: "pantry" },
        { mealSlotId: "mon_dinner", ingredientId: "ING_0207", amount: 0.5, declaredSource: "pantry" },
        { mealSlotId: "wed_breakfast", ingredientId: "ING_0101", amount: 3, declaredSource: "pantry" },
      ],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toEqual([]);

    const eggLedger = result.ledger.find((e) => e.ingredientId === "ING_0101");
    const tofuLedger = result.ledger.find((e) => e.ingredientId === "ING_0207");
    expect(eggLedger?.finalRemaining).toBe(5);
    expect(tofuLedger?.finalRemaining).toBe(0.5);
  });

  it("같은 재료를 반복해서 초과 요청해도 잔량은 절대 음수가 되지 않는다", () => {
    const input: InventoryGuardInput = {
      initialQuantities: { ING_0305: 1000 }, // 감자 1000g
      usages: [
        { mealSlotId: "mon_dinner", ingredientId: "ING_0305", amount: 400, declaredSource: "pantry" },
        { mealSlotId: "wed_dinner", ingredientId: "ING_0305", amount: 400, declaredSource: "pantry" },
        { mealSlotId: "fri_dinner", ingredientId: "ING_0305", amount: 400, declaredSource: "pantry" }, // 남은 200뿐 → 보정
        { mealSlotId: "sun_dinner", ingredientId: "ING_0305", amount: 400, declaredSource: "pantry" }, // 역시 보정
      ],
    };

    const result = checkInventoryGuard(input);

    expect(result.passed).toBe(true);
    expect(result.correctedUsages).toHaveLength(2);
    expect(result.correctedUsages.map((u) => u.mealSlotId)).toEqual(["fri_dinner", "sun_dinner"]);

    const ledgerEntry = result.ledger.find((e) => e.ingredientId === "ING_0305");
    expect(ledgerEntry?.finalRemaining).toBe(200);
    expect(ledgerEntry?.finalRemaining).toBeGreaterThanOrEqual(0);
    for (const step of ledgerEntry?.consumption ?? []) {
      expect(step.remaining).toBeGreaterThanOrEqual(0);
    }
  });
});
