import 'package:json_annotation/json_annotation.dart';

/// 활동량 계수. 적음 0.9 / 보통 1.0 / 많음 1.15 (명세 §2.1).
enum ActivityLevel {
  @JsonValue('light')
  light,
  @JsonValue('moderate')
  moderate,
  @JsonValue('active')
  active,
}

/// 영양 프로파일. 명세 §2.3 — 판정은 주간 평균으로만 한다.
enum DietProfile {
  @JsonValue('standard')
  standard,
  @JsonValue('growth_boost')
  growthBoost,
  @JsonValue('weight_loss')
  weightLoss,
  @JsonValue('glucose_conscious')
  glucoseConscious,
}

/// 가족 구성원 역할. 명세 §4.1.
enum MemberRole {
  @JsonValue('adult_male')
  adultMale,
  @JsonValue('adult_female')
  adultFemale,
  @JsonValue('teen_male')
  teenMale,
  @JsonValue('teen_female')
  teenFemale,
  @JsonValue('child')
  child,
  @JsonValue('infant')
  infant,
  @JsonValue('senior')
  senior,
}

/// 재료 출처 — 보유 재료인지 구매가 필요한지. 명세 §7 ingredients[].source.
enum IngredientSource {
  @JsonValue('pantry')
  pantry,
  @JsonValue('purchase')
  purchase,
}

/// 가격 출처. 명세 §2.4 — LLM은 금액을 생성하지 않으므로 이 값은 항상 DB 출처(KAMIS/aT)이거나
/// 가격을 못 찾았음을 뜻하는 unavailable이어야 한다.
enum PriceSource {
  @JsonValue('KAMIS')
  kamis,
  @JsonValue('aT')
  at,
  @JsonValue('unavailable')
  unavailable,
}

/// 레시피 난이도. 명세 §7 difficulty ('하'/'중'/'상').
enum Difficulty {
  @JsonValue('하')
  easy,
  @JsonValue('중')
  medium,
  @JsonValue('상')
  hard,
}

/// 요일. 명세 §7 day_of_week.
enum DayOfWeek {
  @JsonValue('Monday')
  monday,
  @JsonValue('Tuesday')
  tuesday,
  @JsonValue('Wednesday')
  wednesday,
  @JsonValue('Thursday')
  thursday,
  @JsonValue('Friday')
  friday,
  @JsonValue('Saturday')
  saturday,
  @JsonValue('Sunday')
  sunday,
}

/// 검증 가드 통과 여부. 명세 §5 V-01~V-05, §7 validation.
enum GuardStatus {
  @JsonValue('passed')
  passed,
  @JsonValue('failed')
  failed,
}
