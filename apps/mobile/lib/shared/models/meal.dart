import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'meal.freezed.dart';
part 'meal.g.dart';

/// 끼니에 들어가는 재료 한 줄. 명세 §7 ingredients[].
/// source가 purchase일 때만 unit_price_krw/extra_cost_krw가 채워진다 (pantry는 0원 취급, §2.4).
@freezed
class MealIngredient with _$MealIngredient {
  const factory MealIngredient({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    required String name,
    required double amount,
    required String unit,
    required IngredientSource source,
    @JsonKey(name: 'unit_price_krw') int? unitPriceKrw,
    @JsonKey(name: 'extra_cost_krw') int? extraCostKrw,
  }) = _MealIngredient;

  factory MealIngredient.fromJson(Map<String, dynamic> json) => _$MealIngredientFromJson(json);
}

/// 끼니 하나. 명세 §4.4 끼니별 비용, §7 weekly_meals[].breakfast/dinner.
///
/// **kcal (§2.1 접미사 규칙)**
/// - [caloriesPerPerson] — `_per_person`, 끼니 카드에 표시하는 1인분 기준
/// - [caloriesHousehold] — `_household`, 가구 전체 합계
///
/// **비용 (§2.4 — 세 숫자를 반드시 구분한다)**
/// - [mealExtraCostKrw] — `meal_extra_cost`. 구매가 필요한 재료만 계산. 끼니 카드·Swap 후보에 표시하는 값.
/// - [mealTotalCostKrw] — `meal_total_cost`. 보유 재료 포함 전체 원가. 레시피 상세 참고용, 카드에는 안 보여준다.
/// - `grocery_total_cost`는 끼니 단위가 아니라 주간 장보기 전체 단위라서 이 클래스가 아니라
///   [CostSummary.groceryTotalCostKrw]에만 존재한다 — 포장 단위 올림 때문에 끼니 합계와 값이 달라지는 게 정상이다.
@freezed
class Meal with _$Meal {
  const factory Meal({
    @JsonKey(name: 'meal_slot_id') required String mealSlotId,
    @JsonKey(name: 'menu_name') required String menuName,
    @JsonKey(name: 'cook_time_min') required int cookTimeMin,
    required Difficulty difficulty,

    @JsonKey(name: 'calories_per_person') required int caloriesPerPerson,
    @JsonKey(name: 'calories_household') required int caloriesHousehold,

    @JsonKey(name: 'meal_coverage_rate') required double mealCoverageRate,
    @JsonKey(name: 'meal_extra_cost_krw') required int mealExtraCostKrw,
    @JsonKey(name: 'meal_total_cost_krw') required int mealTotalCostKrw,

    /// true면 카드에 "약 9,800원+"처럼 표기해 미확인 재료가 있음을 드러낸다 (§2.4).
    @JsonKey(name: 'has_unpriced_ingredient') required bool hasUnpricedIngredient,

    required List<MealIngredient> ingredients,
  }) = _Meal;

  factory Meal.fromJson(Map<String, dynamic> json) => _$MealFromJson(json);
}

/// 하루치 끼니. 명세 §4.3 — 월~일 아침 7 + 저녁 7 = 14끼니, 주말 점심 옵션(기본 OFF) 시 16끼니.
/// breakfast/dinner/lunch는 실패 폴백 시 해당 슬롯만 비어 있을 수 있어 nullable로 둔다 (§5 실패 폴백,
/// "부분 실패 시 성공한 끼니는 그대로 두고 실패 자리에만 안내 카드를 넣는다", §10).
@freezed
class DailyMeals with _$DailyMeals {
  const factory DailyMeals({
    @JsonKey(name: 'day_of_week') required DayOfWeek dayOfWeek,
    required String date,
    Meal? breakfast,
    Meal? lunch,
    Meal? dinner,
  }) = _DailyMeals;

  factory DailyMeals.fromJson(Map<String, dynamic> json) => _$DailyMealsFromJson(json);
}
