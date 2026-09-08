import 'package:freezed_annotation/freezed_annotation.dart';

import 'family_member.dart';

part 'household_info.freezed.dart';
part 'household_info.g.dart';

/// 아침/저녁/합계 가구 목표 칼로리. §2.1 `_household` 접미사.
///
/// §7 예시의 `managed_target_kcal_household: { breakfast, dinner, total }`도
/// 리프 필드마다 접미사를 붙이도록 [FamilyMember]/[MealTargetKcalPerPerson]과 같은 방식으로 정규화했다.
@freezed
class ManagedTargetKcalHousehold with _$ManagedTargetKcalHousehold {
  const factory ManagedTargetKcalHousehold({
    @JsonKey(name: 'breakfast_kcal_household') required int breakfastKcalHousehold,
    @JsonKey(name: 'dinner_kcal_household') required int dinnerKcalHousehold,
    @JsonKey(name: 'total_kcal_household') required int totalKcalHousehold,
  }) = _ManagedTargetKcalHousehold;

  factory ManagedTargetKcalHousehold.fromJson(Map<String, dynamic> json) =>
      _$ManagedTargetKcalHouseholdFromJson(json);
}

/// 탄/단/지 비율(0~1). kcal이 아니라 비율이므로 §2.1 접미사 규칙 대상이 아니다.
/// household_info.nutrition_target_ratio와 metrics.weekly_nutrition_ratio 양쪽에 쓰인다 (§2.3, §7).
@freezed
class NutritionRatio with _$NutritionRatio {
  const factory NutritionRatio({
    required double carb,
    required double protein,
    required double fat,
  }) = _NutritionRatio;

  factory NutritionRatio.fromJson(Map<String, dynamic> json) => _$NutritionRatioFromJson(json);
}

/// 가구 정보. 명세 §7 household_info.
@freezed
class HouseholdInfo with _$HouseholdInfo {
  const factory HouseholdInfo({
    required List<FamilyMember> members,

    /// §2.1 `_household` 접미사. 가구 전체 하루 목표 칼로리 (구성원 합).
    @JsonKey(name: 'daily_target_kcal_household') required int dailyTargetKcalHousehold,
    @JsonKey(name: 'managed_target_kcal_household')
    required ManagedTargetKcalHousehold managedTargetKcalHousehold,

    @JsonKey(name: 'household_allergens_union') required List<String> householdAllergensUnion,
    @JsonKey(name: 'nutrition_target_ratio') required NutritionRatio nutritionTargetRatio,
  }) = _HouseholdInfo;

  factory HouseholdInfo.fromJson(Map<String, dynamic> json) => _$HouseholdInfoFromJson(json);
}
