import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';
import 'household_info.dart';

part 'metrics.freezed.dart';
part 'metrics.g.dart';

/// 냉장고 활용·영양 지표. 명세 §2.2 (pantry_coverage_rate ≥0.60, expiry_priority_rate ≥0.90),
/// §2.3 (weekly_nutrition_ratio는 주간 평균으로만 판정), §7 metrics.
@freezed
class Metrics with _$Metrics {
  const factory Metrics({
    @JsonKey(name: 'pantry_coverage_rate') required double pantryCoverageRate,
    @JsonKey(name: 'expiry_priority_rate') required double expiryPriorityRate,
    @JsonKey(name: 'weekly_nutrition_ratio') required NutritionRatio weeklyNutritionRatio,
  }) = _Metrics;

  factory Metrics.fromJson(Map<String, dynamic> json) => _$MetricsFromJson(json);
}

/// 검증 가드 결과 요약. 명세 §5 검증 가드(V-01~V-05), §7 validation.
/// V-01(알레르기)은 어떤 경우에도 우회하지 않는다 — 이 요약이 failed면 해당 식단을 화면에 노출하면 안 된다.
@freezed
class ValidationSummary with _$ValidationSummary {
  const factory ValidationSummary({
    @JsonKey(name: 'allergen_guard') required GuardStatus allergenGuard,
    @JsonKey(name: 'cook_time_guard') required GuardStatus cookTimeGuard,
    @JsonKey(name: 'diversity_guard') required GuardStatus diversityGuard,
    @JsonKey(name: 'inventory_guard') required GuardStatus inventoryGuard,
    @JsonKey(name: 'regeneration_count') required int regenerationCount,
  }) = _ValidationSummary;

  factory ValidationSummary.fromJson(Map<String, dynamic> json) => _$ValidationSummaryFromJson(json);
}
