import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'grocery.freezed.dart';
part 'grocery.g.dart';

/// 장보기 목록 한 줄 — 포장 단위 올림이 반영된 값. 명세 §2.4, §7 grocery_list[].
/// [packageQuantity]/[packagePriceKrw]가 null이면 [priceSource]는 반드시 [PriceSource.unavailable]이다.
@freezed
class GroceryListItem with _$GroceryListItem {
  const factory GroceryListItem({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    required String name,
    @JsonKey(name: 'required_quantity') required double requiredQuantity,
    required String unit,
    @JsonKey(name: 'package_quantity') double? packageQuantity,
    @JsonKey(name: 'package_price_krw') int? packagePriceKrw,
    @JsonKey(name: 'price_source') required PriceSource priceSource,
    @JsonKey(name: 'price_reference_date') String? priceReferenceDate,
  }) = _GroceryListItem;

  factory GroceryListItem.fromJson(Map<String, dynamic> json) => _$GroceryListItemFromJson(json);
}

/// 비용 요약. 명세 §2.4 — 세 숫자를 반드시 구분한다. 이름을 섞으면 화면마다 금액이 달라 보인다.
///
/// - [groceryTotalCostKrw] — `grocery_total_cost`. 포장 단위 올림 후 합계, 장보기 견적서에 표시.
/// - [mealExtraCostSumKrw] — 끼니별 [Meal.mealExtraCostKrw]의 주간 합. **장보기 총액과 다른 게 정상**이다
///   (소고기 400g이 필요해도 마트는 600g 팩으로 파는 식의 포장 단위 차이).
/// - [pantryValueKrw] — 보유 재료를 포함한 [Meal.mealTotalCostKrw] 계열의 참고용 가치.
@freezed
class CostSummary with _$CostSummary {
  const factory CostSummary({
    @JsonKey(name: 'grocery_total_cost_krw') required int groceryTotalCostKrw,
    @JsonKey(name: 'meal_extra_cost_sum_krw') required int mealExtraCostSumKrw,
    @JsonKey(name: 'pantry_value_krw') required int pantryValueKrw,
    @JsonKey(name: 'priced_item_count') required int pricedItemCount,
    @JsonKey(name: 'unpriced_item_count') required int unpricedItemCount,
    @JsonKey(name: 'price_reference_date') required String priceReferenceDate,
  }) = _CostSummary;

  factory CostSummary.fromJson(Map<String, dynamic> json) => _$CostSummaryFromJson(json);
}
