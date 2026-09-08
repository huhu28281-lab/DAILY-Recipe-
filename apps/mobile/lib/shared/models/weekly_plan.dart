import 'package:freezed_annotation/freezed_annotation.dart';

import 'grocery.dart';
import 'household_info.dart';
import 'meal.dart';
import 'metrics.dart';
import 'pantry_ledger.dart';
import 'pantry_status.dart';

part 'weekly_plan.freezed.dart';
part 'weekly_plan.g.dart';

/// 주간 식단 전체. 명세 §7 데이터 스키마 최상위 객체.
///
/// 정본은 `packages/contracts/schema/weekly_plan.example.json`, 서버 측 TS 표현은
/// `apps/api/src/types/schema.ts` — 세 곳의 필드 이름이 어긋나면 안 된다. 단, kcal 필드는
/// §2.1 규칙(모든 kcal은 `_per_person`/`_household` 접미사를 가진다)을 엄격히 적용해
/// §7 예시의 `_per_member` 표기를 `_per_person`으로 정규화했고, 비용은 §2.4의 세 값
/// (`meal_extra_cost` / `meal_total_cost` / `grocery_total_cost`)을 항상 별도 필드로 유지한다.
/// 근거는 §2 서두: "이 장이 다른 서술과 충돌하면 이 장이 이긴다."
@freezed
class WeeklyPlan with _$WeeklyPlan {
  const factory WeeklyPlan({
    @JsonKey(name: 'plan_id') required String planId,
    @JsonKey(name: 'schema_version') required String schemaVersion,
    @JsonKey(name: 'week_start_date') required String weekStartDate,
    @JsonKey(name: 'household_info') required HouseholdInfo householdInfo,
    @JsonKey(name: 'pantry_status') required PantryStatus pantryStatus,
    @JsonKey(name: 'weekly_meals') required List<DailyMeals> weeklyMeals,
    @JsonKey(name: 'pantry_ledger') required List<PantryLedgerEntry> pantryLedger,
    @JsonKey(name: 'grocery_list') required List<GroceryListItem> groceryList,
    @JsonKey(name: 'cost_summary') required CostSummary costSummary,
    required Metrics metrics,
    required ValidationSummary validation,
  }) = _WeeklyPlan;

  factory WeeklyPlan.fromJson(Map<String, dynamic> json) => _$WeeklyPlanFromJson(json);
}
