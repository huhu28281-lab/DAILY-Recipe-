import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'family_member.freezed.dart';
part 'family_member.g.dart';

/// 구성원의 끼니별 1인분 목표 칼로리.
///
/// 명세 §2.1: kcal을 담는 모든 필드는 `_per_person`(1인분) / `_household`(가구 합계)
/// 접미사를 가져야 한다. §7 예시 JSON은 이 객체를 `meal_target_kcal_per_member`로,
/// 안의 값은 `breakfast`/`dinner`로만 표기하는데 이는 §2.1의 "모든 필드" 규칙과 어긋난다.
/// §2.1: "이 장이 다른 서술과 충돌하면 이 장이 이긴다" — 그래서 이 계약에서는
/// 리프 필드 각각에 `_per_person`을 직접 붙인다.
@freezed
class MealTargetKcalPerPerson with _$MealTargetKcalPerPerson {
  const factory MealTargetKcalPerPerson({
    @JsonKey(name: 'breakfast_kcal_per_person') required int breakfastKcalPerPerson,
    @JsonKey(name: 'dinner_kcal_per_person') required int dinnerKcalPerPerson,
  }) = _MealTargetKcalPerPerson;

  factory MealTargetKcalPerPerson.fromJson(Map<String, dynamic> json) =>
      _$MealTargetKcalPerPersonFromJson(json);
}

/// 가족 구성원 한 명. 명세 §4.1 가족 프로필, §7 household_info.members[].
@freezed
class FamilyMember with _$FamilyMember {
  const factory FamilyMember({
    @JsonKey(name: 'member_id') required String memberId,
    required String label,
    required MemberRole role,
    @JsonKey(name: 'activity_level') required ActivityLevel activityLevel,

    /// §2.1 `_per_person` 접미사. 구성원 1인 하루 목표 칼로리 (KDRIs × 활동량 계수).
    @JsonKey(name: 'daily_target_kcal_per_person') required int dailyTargetKcalPerPerson,
    @JsonKey(name: 'meal_target_kcal_per_person') required MealTargetKcalPerPerson mealTargetKcalPerPerson,

    required List<String> allergens,
    @JsonKey(name: 'diet_profile') required DietProfile dietProfile,
  }) = _FamilyMember;

  factory FamilyMember.fromJson(Map<String, dynamic> json) => _$FamilyMemberFromJson(json);
}
