// 검증 가드 V-01~V-05. 명세 §5, §6(Absolute Constraints).
//
// V-01 알레르기 유니온 재료가 어떤 끼니에도 없을 것
//      (ingredient_id → allergen_tags 매핑으로 판정, 문자열 매칭 금지. 절대 우회하지 않는다)
// V-02 아침 조리시간 ≤15분, 저녁 조리시간 30~40분
//      (§5 표는 "저녁 ≤40분"으로 축약돼 있지만 §6 Absolute Constraints #4가
//       "저녁은 30분 이상 40분 이하로 설계하라"고 명시하고 "위반 시 출력 전체가 폐기된다"고
//       못박아 게이트 레벨 제약임을 분명히 한다 — 그래서 하한 30분도 함께 검증한다)
// V-03 연속 3끼니 주재료 중복 금지 · 주간 메뉴 중복 금지 · 최근 4주 이력 중복률 ≤30%
// V-04 재고 잔량 음수 금지 — 실패해도 전체를 버리지 않고 초과분만 purchase로 전환한 뒤 통과시킨다
//      (다른 가드와 달리 "재생성"이 아니라 "자동 보정"이 실패 시 동작이다)
// V-05 모든 재료가 유효한 ingredient_id를 가질 것 — 우선 퍼지 매칭으로 복구를 시도하고,
//      그래도 못 찾으면 재생성한다
//
// apps/api/test/validators/*.test.ts 가 이 계약을 기준으로 먼저 작성됐고(TDD), 아래 구현은 그 테스트를 통과시킨다.

import type { IngredientSource } from "../types/schema";

export type GuardId = "V-01" | "V-02" | "V-03" | "V-04" | "V-05";

export type GuardResult = {
  guardId: GuardId;
  passed: boolean;
  reason?: string;
};

// ============================================================
// V-01 — 알레르기 가드
// ============================================================

/** 끼니 하나에서 이 가드가 볼 필요가 있는 최소 정보. */
export type MealForAllergenCheck = {
  mealSlotId: string;
  ingredientIds: string[];
};

export type AllergenGuardInput = {
  /** household_allergens_union — 가구 구성원 전체의 알레르기 합집합 (allergen_id 목록). */
  householdAllergenUnion: string[];
  /** ingredient_id → allergen_id[] 매핑. ingredient_allergen_tags 테이블에 대응 (재료명 문자열이 아니다). */
  ingredientAllergenMap: Record<string, string[]>;
  meals: MealForAllergenCheck[];
};

export type AllergenViolation = {
  mealSlotId: string;
  ingredientId: string;
  allergenId: string;
};

export type AllergenGuardResult = GuardResult & {
  guardId: "V-01";
  /** 위반이 하나도 없으면 빈 배열. 실패 시 "끼니 폐기 후 재생성"에 필요한 최소 단위(끼니)까지 알려준다. */
  violations: AllergenViolation[];
};

/**
 * V-01: household_allergens_union에 속한 알레르기 재료가 어떤 끼니에도 없어야 한다.
 * 판정은 반드시 ingredientAllergenMap(ingredient_id → allergen_tags)을 통해서만 하고,
 * 재료명 문자열을 검사하지 않는다 — 가공식품의 숨은 원료를 문자열로는 못 잡기 때문이다.
 * 이 가드는 어떤 경우에도 우회하지 않는다.
 */
export function checkAllergenGuard(input: AllergenGuardInput): AllergenGuardResult {
  const allergenUnion = new Set(input.householdAllergenUnion);
  const violations: AllergenViolation[] = [];

  for (const meal of input.meals) {
    for (const ingredientId of meal.ingredientIds) {
      const tags = input.ingredientAllergenMap[ingredientId] ?? [];
      for (const allergenId of tags) {
        if (allergenUnion.has(allergenId)) {
          violations.push({ mealSlotId: meal.mealSlotId, ingredientId, allergenId });
        }
      }
    }
  }

  return {
    guardId: "V-01",
    passed: violations.length === 0,
    reason: violations.length > 0 ? `알레르기 재료가 포함된 끼니 ${new Set(violations.map((v) => v.mealSlotId)).size}건 발견` : undefined,
    violations,
  };
}

// ============================================================
// V-02 — 조리시간 가드
// ============================================================

export type MealType = "breakfast" | "lunch" | "dinner";

export type MealForCookTimeCheck = {
  mealSlotId: string;
  mealType: MealType;
  cookTimeMin: number;
};

export type CookTimeGuardInput = {
  meals: MealForCookTimeCheck[];
};

export type CookTimeViolation = {
  mealSlotId: string;
  mealType: MealType;
  cookTimeMin: number;
  reason: string;
};

export type CookTimeGuardResult = GuardResult & {
  guardId: "V-02";
  violations: CookTimeViolation[];
};

/**
 * V-02: 아침은 15분 이하, 저녁은 30~40분(포함) 이어야 한다.
 * 주말 점심 옵션(lunch)은 명세에 시간 상한이 없어 이 가드의 검사 대상이 아니다.
 */
export function checkCookTimeGuard(input: CookTimeGuardInput): CookTimeGuardResult {
  const violations: CookTimeViolation[] = [];

  for (const meal of input.meals) {
    if (meal.mealType === "breakfast" && (meal.cookTimeMin <= 0 || meal.cookTimeMin > 15)) {
      violations.push({
        mealSlotId: meal.mealSlotId,
        mealType: meal.mealType,
        cookTimeMin: meal.cookTimeMin,
        reason: `아침 조리시간은 15분 이하여야 하는데 ${meal.cookTimeMin}분입니다.`,
      });
    } else if (meal.mealType === "dinner" && (meal.cookTimeMin < 30 || meal.cookTimeMin > 40)) {
      violations.push({
        mealSlotId: meal.mealSlotId,
        mealType: meal.mealType,
        cookTimeMin: meal.cookTimeMin,
        reason: `저녁 조리시간은 30~40분이어야 하는데 ${meal.cookTimeMin}분입니다.`,
      });
    }
    // lunch(주말 점심 옵션)는 명세에 시간 상한이 없어 검사하지 않는다.
  }

  return {
    guardId: "V-02",
    passed: violations.length === 0,
    violations,
  };
}

// ============================================================
// V-03 — 다양성 가드
// ============================================================

/**
 * 다양성 판정에 필요한 끼니 정보. 배열 순서가 곧 시간 순서다
 * (예: 월아침, 월저녁, 화아침, 화저녁, ... 슬롯 순서 그대로 넣어야 "연속 3끼니" 판정이 맞는다).
 */
export type MealForDiversityCheck = {
  mealSlotId: string;
  menuName: string;
  /** 그 끼니의 주재료 ingredient_id. "연속 3끼니 주재료 중복 금지" 판정 기준. */
  mainIngredientId: string;
};

export type DiversityGuardInput = {
  /** 이번 주 14~16끼니, 슬롯 시간 순으로 정렬된 배열. */
  orderedMeals: MealForDiversityCheck[];
  /** 최근 4주 이력에 등장한 메뉴명 집합. */
  recentMenuNamesLast4Weeks: string[];
};

export type ConsecutiveMainIngredientViolation = {
  mealSlotIds: string[]; // 연속된 3개 이상의 슬롯 id
  ingredientId: string;
};

export type DiversityGuardResult = GuardResult & {
  guardId: "V-03";
  consecutiveMainIngredientViolations: ConsecutiveMainIngredientViolation[];
  /** 이번 주 안에서 2회 이상 등장한 메뉴명. */
  duplicateMenuNamesInWeek: string[];
  /** 이번 주 메뉴 중 최근 4주 이력과 겹치는 비율 (0~1). */
  historyDuplicateRate: number;
  historyDuplicateRateExceeded: boolean;
};

/**
 * V-03: 연속 3끼니 이상 동일 주재료 금지 · 이번 주 내 동일 메뉴 중복 금지 ·
 * 최근 4주 이력 중복률 30% 초과 금지.
 */
const DIVERSITY_MAX_HISTORY_DUPLICATE_RATE = 0.3;
const FLOAT_EPSILON = 1e-9;

export function checkDiversityGuard(input: DiversityGuardInput): DiversityGuardResult {
  const { orderedMeals, recentMenuNamesLast4Weeks } = input;

  // 연속 3끼니 이상 동일 주재료 — 배열을 한 번 훑으며 같은 주재료가 이어지는 구간(run)을 찾는다.
  const consecutiveMainIngredientViolations: ConsecutiveMainIngredientViolation[] = [];
  let run: MealForDiversityCheck[] = [];

  const flushRun = () => {
    if (run.length >= 3) {
      const first = run[0];
      if (first !== undefined) {
        consecutiveMainIngredientViolations.push({
          mealSlotIds: run.map((m) => m.mealSlotId),
          ingredientId: first.mainIngredientId,
        });
      }
    }
    run = [];
  };

  for (const currentMeal of orderedMeals) {
    const last = run[run.length - 1];
    if (last !== undefined && last.mainIngredientId !== currentMeal.mainIngredientId) {
      flushRun();
    }
    run.push(currentMeal);
  }
  flushRun();

  // 이번 주 내 동일 메뉴 중복
  const menuCounts = new Map<string, number>();
  for (const currentMeal of orderedMeals) {
    menuCounts.set(currentMeal.menuName, (menuCounts.get(currentMeal.menuName) ?? 0) + 1);
  }
  const duplicateMenuNamesInWeek = [...menuCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([menuName]) => menuName);

  // 최근 4주 이력 중복률
  const recentMenuSet = new Set(recentMenuNamesLast4Weeks);
  const overlapCount = orderedMeals.filter((m) => recentMenuSet.has(m.menuName)).length;
  const historyDuplicateRate = orderedMeals.length === 0 ? 0 : overlapCount / orderedMeals.length;
  const historyDuplicateRateExceeded = historyDuplicateRate > DIVERSITY_MAX_HISTORY_DUPLICATE_RATE + FLOAT_EPSILON;

  const passed =
    consecutiveMainIngredientViolations.length === 0 &&
    duplicateMenuNamesInWeek.length === 0 &&
    !historyDuplicateRateExceeded;

  return {
    guardId: "V-03",
    passed,
    reason: passed ? undefined : "다양성 규칙(연속 주재료·주간 중복·이력 중복률) 중 하나 이상을 위반했습니다.",
    consecutiveMainIngredientViolations,
    duplicateMenuNamesInWeek,
    historyDuplicateRate,
    historyDuplicateRateExceeded,
  };
}

// ============================================================
// V-04 — 재고 원장 가드 (다른 가드와 달리 실패 시 "재생성"이 아니라 "자동 보정 후 통과")
// ============================================================

export type PantryUsage = {
  mealSlotId: string;
  ingredientId: string;
  amount: number;
  /** LLM/파이프라인이 애초에 매긴 출처. 원장 계산 결과 pantry→purchase로 보정될 수 있다. */
  declaredSource: IngredientSource;
};

export type InventoryGuardInput = {
  /** ingredient_id → 초기 보유 수량. */
  initialQuantities: Record<string, number>;
  /** 끼니 슬롯 순서대로 정렬된 사용 내역 (같은 재료라도 순서가 잔량 계산에 영향을 준다). */
  usages: PantryUsage[];
};

export type PantryLedgerConsumption = {
  mealSlotId: string;
  amount: number;
  remaining: number;
};

export type PantryLedgerEntry = {
  ingredientId: string;
  initialQuantity: number;
  consumption: PantryLedgerConsumption[];
  finalRemaining: number;
};

export type CorrectedUsage = PantryUsage & {
  /** 원장 계산 결과 실제로 적용된 출처. declaredSource와 다르면 이 가드가 보정한 것이다. */
  resolvedSource: IngredientSource;
};

export type InventoryGuardResult = GuardResult & {
  guardId: "V-04";
  /** 항상 true다 — 이 가드는 데이터를 버리지 않고 보정하기 때문에 규칙 위반만으로는 실패하지 않는다. */
  passed: true;
  correctedUsages: CorrectedUsage[];
  ledger: PantryLedgerEntry[];
};

/**
 * V-04: 재고 잔량은 절대 음수가 될 수 없다.
 * pantry로 선언된 사용량이 그 시점까지 남은 잔량을 초과하면, 그 사용 건 전체를 purchase로 전환하고
 * (부분 전환은 하지 않는다 — 재료 한 줄은 pantry이거나 purchase다) 잔량은 그대로 유지한다.
 * 이미 purchase로 선언된 사용은 잔량에 영향을 주지 않는다.
 */
export function checkInventoryGuard(input: InventoryGuardInput): InventoryGuardResult {
  const remaining = new Map<string, number>(Object.entries(input.initialQuantities));
  const consumptionByIngredient = new Map<string, PantryLedgerConsumption[]>();
  for (const ingredientId of Object.keys(input.initialQuantities)) {
    consumptionByIngredient.set(ingredientId, []);
  }

  const correctedUsages: CorrectedUsage[] = [];

  for (const usage of input.usages) {
    let resolvedSource: IngredientSource = usage.declaredSource;

    if (usage.declaredSource === "pantry") {
      const currentRemaining = remaining.get(usage.ingredientId) ?? 0;
      if (usage.amount <= currentRemaining) {
        const newRemaining = currentRemaining - usage.amount;
        remaining.set(usage.ingredientId, newRemaining);
        const consumption = consumptionByIngredient.get(usage.ingredientId) ?? [];
        consumption.push({ mealSlotId: usage.mealSlotId, amount: usage.amount, remaining: newRemaining });
        consumptionByIngredient.set(usage.ingredientId, consumption);
      } else {
        // 보유량을 초과하는 pantry 사용은 부분 전환하지 않고 그 줄 전체를 purchase로 바꾼다.
        // 재고는 건드리지 않으므로 remaining은 그대로 유지된다.
        resolvedSource = "purchase";
      }
    }
    // declaredSource가 이미 purchase면 재고에 영향을 주지 않는다.

    if (resolvedSource !== usage.declaredSource) {
      correctedUsages.push({ ...usage, resolvedSource });
    }
  }

  const ledger: PantryLedgerEntry[] = Object.entries(input.initialQuantities).map(
    ([ingredientId, initialQuantity]) => ({
      ingredientId,
      initialQuantity,
      consumption: consumptionByIngredient.get(ingredientId) ?? [],
      finalRemaining: remaining.get(ingredientId) ?? initialQuantity,
    }),
  );

  return {
    guardId: "V-04",
    passed: true,
    correctedUsages,
    ledger,
  };
}

// ============================================================
// V-05 — ingredient_id 유효성 가드
// ============================================================

export type IngredientMasterRef = {
  ingredientId: string;
  name: string;
};

export type IngredientIdGuardInput = {
  /** LLM이 실제로 출력한 ingredient_id 목록 (오탈자·공백·대소문자 오류가 있을 수 있다). */
  usedIngredientIds: string[];
  /** ingredient_master 전체(또는 프롬프트에 넣어준 서브셋). */
  validIngredientMaster: IngredientMasterRef[];
  /** 퍼지 매칭 허용 최대 편집 거리. 기본값은 구현체가 정한다 (예: 2). */
  fuzzyMatchMaxDistance?: number;
};

export type IngredientIdResolutionMethod = "exact" | "fuzzy" | "unresolved";

export type IngredientIdResolution = {
  original: string;
  resolved: string | null;
  method: IngredientIdResolutionMethod;
};

export type IngredientIdGuardResult = GuardResult & {
  guardId: "V-05";
  resolutions: IngredientIdResolution[];
};

/**
 * V-05: 모든 ingredient_id는 ingredient_master에 존재해야 한다.
 * 정확히 일치하지 않으면(대소문자·공백 차이, 사소한 오탈자) 퍼지 매칭으로 복구를 시도한다.
 * 그래도 근접한 후보를 찾지 못한 재료가 하나라도 있으면 가드는 실패하고(재생성 트리거),
 * resolutions 배열로 어떤 id가 왜 실패했는지 드러낸다.
 */
const DEFAULT_FUZZY_MATCH_MAX_DISTANCE = 2;

function normalizeId(value: string): string {
  return value.trim().toUpperCase();
}

/** 표준 편집 거리(Levenshtein distance). 대소문자/공백 정규화는 호출부에서 미리 한다. */
function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = [];
  for (let i = 0; i < rows; i++) {
    dp.push(new Array(cols).fill(0));
  }
  for (let i = 0; i < rows; i++) dp[i]![0] = i;
  for (let j = 0; j < cols; j++) dp[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // 삭제
        dp[i]![j - 1]! + 1, // 삽입
        dp[i - 1]![j - 1]! + substitutionCost, // 치환
      );
    }
  }

  return dp[rows - 1]![cols - 1]!;
}

export function checkIngredientIdGuard(input: IngredientIdGuardInput): IngredientIdGuardResult {
  const maxDistance = input.fuzzyMatchMaxDistance ?? DEFAULT_FUZZY_MATCH_MAX_DISTANCE;
  const validIds = new Set(input.validIngredientMaster.map((m) => m.ingredientId));
  const resolutions: IngredientIdResolution[] = [];

  for (const original of input.usedIngredientIds) {
    // 1) 완전 일치
    if (validIds.has(original)) {
      resolutions.push({ original, resolved: original, method: "exact" });
      continue;
    }

    // 2) 대소문자/공백 정규화 후 id 일치, 또는 재료명 완전 일치 — 사소한 표기 차이는 퍼지로 간주한다.
    const normalizedOriginal = normalizeId(original);
    const idMatch = input.validIngredientMaster.find(
      (candidate) => normalizeId(candidate.ingredientId) === normalizedOriginal,
    );
    if (idMatch) {
      resolutions.push({ original, resolved: idMatch.ingredientId, method: "fuzzy" });
      continue;
    }

    const trimmedOriginal = original.trim();
    const nameMatch = input.validIngredientMaster.find((candidate) => candidate.name === trimmedOriginal);
    if (nameMatch) {
      resolutions.push({ original, resolved: nameMatch.ingredientId, method: "fuzzy" });
      continue;
    }

    // 3) 편집 거리 기반 퍼지 매칭 — id와 이름 둘 다 후보로 비교해 가장 가까운 것을 찾는다.
    let bestMatch: IngredientMasterRef | null = null;
    let bestDistance = Infinity;
    for (const candidate of input.validIngredientMaster) {
      const idDistance = levenshteinDistance(normalizedOriginal, normalizeId(candidate.ingredientId));
      const nameDistance = levenshteinDistance(trimmedOriginal, candidate.name);
      const distance = Math.min(idDistance, nameDistance);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }

    if (bestMatch && bestDistance <= maxDistance) {
      resolutions.push({ original, resolved: bestMatch.ingredientId, method: "fuzzy" });
    } else {
      resolutions.push({ original, resolved: null, method: "unresolved" });
    }
  }

  const passed = resolutions.every((r) => r.method !== "unresolved");

  return {
    guardId: "V-05",
    passed,
    reason: passed ? undefined : "일부 ingredient_id를 유효한 재료로 매칭하지 못했습니다.",
    resolutions,
  };
}
