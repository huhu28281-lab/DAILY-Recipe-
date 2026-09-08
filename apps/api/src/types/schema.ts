// weekly_plan 데이터 계약. 명세 §7과 1:1 대응.
// 실제 정본은 packages/contracts/schema/weekly_plan.example.json — 이 타입은 그 계약의 TS 표현이다.
// kcal 필드는 반드시 _per_person / _household 접미사를 가진다 (§2.1). 접미사 없는 kcal 필드는 버그다.
// §7 예시 JSON의 `_per_member` 표기는 §2.1과 어긋나 여기서는 `_per_person`으로 정규화했다.
// (§2: "이 장이 다른 서술과 충돌하면 이 장이 이긴다.") Dart 쪽 계약은 apps/mobile/lib/shared/models 참고.

export type ActivityLevel = "light" | "moderate" | "active";
export type DietProfile = "standard" | "growth_boost" | "weight_loss" | "glucose_conscious";
export type MemberRole = "adult_male" | "adult_female" | "teen_male" | "teen_female" | "child" | "infant" | "senior";

export type FamilyMember = {
  member_id: string;
  label: string;
  role: MemberRole;
  activity_level: ActivityLevel;
  daily_target_kcal_per_person: number;
  meal_target_kcal_per_person: { breakfast_kcal_per_person: number; dinner_kcal_per_person: number };
  allergens: string[];
  diet_profile: DietProfile;
};

export type HouseholdInfo = {
  members: FamilyMember[];
  daily_target_kcal_household: number;
  managed_target_kcal_household: {
    breakfast_kcal_household: number;
    dinner_kcal_household: number;
    total_kcal_household: number;
  };
  household_allergens_union: string[];
  nutrition_target_ratio: { carb: number; protein: number; fat: number };
};

export type IngredientSource = "pantry" | "purchase";

export type OwnedIngredient = {
  ingredient_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  is_priority: boolean;
  is_staple: boolean;
};

export type PantryStatus = {
  owned_ingredients: OwnedIngredient[];
  wishlist_ingredients: { ingredient_id: string; name: string }[];
  recommended_seasonal: { ingredient_id: string; name: string; reason_nutrient: string }[];
};

export type MealIngredient = {
  ingredient_id: string;
  name: string;
  amount: number;
  unit: string;
  source: IngredientSource;
  unit_price_krw?: number;
  extra_cost_krw?: number;
};

export type Meal = {
  meal_slot_id: string;
  menu_name: string;
  cook_time_min: number;
  difficulty: "하" | "중" | "상";
  calories_per_person: number;
  calories_household: number;
  meal_coverage_rate: number;
  meal_extra_cost_krw: number;
  meal_total_cost_krw: number;
  has_unpriced_ingredient: boolean;
  ingredients: MealIngredient[];
};

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type DailyMeals = {
  day_of_week: DayOfWeek;
  date: string;
  breakfast?: Meal;
  dinner?: Meal;
  lunch?: Meal; // 주말 점심 옵션 (기본 OFF, §4.3)
};

export type PantryLedgerEntry = {
  ingredient_id: string;
  initial_quantity: number;
  unit: string;
  consumption: { meal_slot_id: string; amount: number; remaining: number }[];
  final_remaining: number;
  fully_consumed_before_expiry: boolean;
};

export type PriceSource = "KAMIS" | "aT" | "unavailable";

export type GroceryListItem = {
  ingredient_id: string;
  name: string;
  required_quantity: number;
  unit: string;
  package_quantity: number | null;
  package_price_krw: number | null;
  price_source: PriceSource;
  price_reference_date: string | null;
};

export type CostSummary = {
  grocery_total_cost_krw: number;
  meal_extra_cost_sum_krw: number;
  pantry_value_krw: number;
  priced_item_count: number;
  unpriced_item_count: number;
  price_reference_date: string;
};

export type Metrics = {
  pantry_coverage_rate: number;
  expiry_priority_rate: number;
  weekly_nutrition_ratio: { carb: number; protein: number; fat: number };
};

export type GuardStatus = "passed" | "failed";

export type ValidationSummary = {
  allergen_guard: GuardStatus;
  cook_time_guard: GuardStatus;
  diversity_guard: GuardStatus;
  inventory_guard: GuardStatus;
  regeneration_count: number;
};

export type WeeklyPlan = {
  plan_id: string;
  schema_version: string;
  week_start_date: string;
  household_info: HouseholdInfo;
  pantry_status: PantryStatus;
  weekly_meals: DailyMeals[];
  pantry_ledger: PantryLedgerEntry[];
  grocery_list: GroceryListItem[];
  cost_summary: CostSummary;
  metrics: Metrics;
  validation: ValidationSummary;
};
