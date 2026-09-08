import 'package:freezed_annotation/freezed_annotation.dart';

part 'pantry_status.freezed.dart';
part 'pantry_status.g.dart';

/// 보유 재료 한 줄. 명세 §4.2 식재료 보관함, §7 owned_ingredients[].
/// kcal/가격 필드가 없다 — 이 값들은 ingredient_id를 통해 DB에서 조회한다 (§1 "LLM은 메뉴만" 원칙과 동일하게,
/// 클라이언트도 재료 자체에 금액·칼로리를 들고 다니지 않는다).
@freezed
class OwnedIngredient with _$OwnedIngredient {
  const factory OwnedIngredient({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    required String name,
    required String category,
    required double quantity,
    required String unit,
    @JsonKey(name: 'expiry_date') String? expiryDate,

    /// D-3 이내 자동 플래그 (§4.2). true면 배치 가중치 3.0.
    @JsonKey(name: 'is_priority') required bool isPriority,

    /// 양념류 등 §2.2/§2.4 계산에서 제외되는 재료.
    @JsonKey(name: 'is_staple') required bool isStaple,
  }) = _OwnedIngredient;

  factory OwnedIngredient.fromJson(Map<String, dynamic> json) => _$OwnedIngredientFromJson(json);
}

/// 구매 예정(위시리스트) 재료. 배치 가중치 2.0 (§4.2).
@freezed
class WishlistIngredient with _$WishlistIngredient {
  const factory WishlistIngredient({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    required String name,
  }) = _WishlistIngredient;

  factory WishlistIngredient.fromJson(Map<String, dynamic> json) => _$WishlistIngredientFromJson(json);
}

/// 제철 재료 추천. 시스템 월 기준 큐레이션 + 보완 영양소 사유 (§4.2).
@freezed
class SeasonalIngredient with _$SeasonalIngredient {
  const factory SeasonalIngredient({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    required String name,
    @JsonKey(name: 'reason_nutrient') required String reasonNutrient,
  }) = _SeasonalIngredient;

  factory SeasonalIngredient.fromJson(Map<String, dynamic> json) => _$SeasonalIngredientFromJson(json);
}

/// 식재료 보관함 전체. 명세 §7 pantry_status.
@freezed
class PantryStatus with _$PantryStatus {
  const factory PantryStatus({
    @JsonKey(name: 'owned_ingredients') required List<OwnedIngredient> ownedIngredients,
    @JsonKey(name: 'wishlist_ingredients') required List<WishlistIngredient> wishlistIngredients,
    @JsonKey(name: 'recommended_seasonal') required List<SeasonalIngredient> recommendedSeasonal,
  }) = _PantryStatus;

  factory PantryStatus.fromJson(Map<String, dynamic> json) => _$PantryStatusFromJson(json);
}
