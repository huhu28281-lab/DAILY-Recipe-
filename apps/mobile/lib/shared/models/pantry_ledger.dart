import 'package:freezed_annotation/freezed_annotation.dart';

part 'pantry_ledger.freezed.dart';
part 'pantry_ledger.g.dart';

/// 재고 차감 원장의 소비 한 줄. 명세 §4.2, §7 pantry_ledger[].consumption[].
@freezed
class PantryLedgerConsumption with _$PantryLedgerConsumption {
  const factory PantryLedgerConsumption({
    @JsonKey(name: 'meal_slot_id') required String mealSlotId,
    required double amount,
    required double remaining,
  }) = _PantryLedgerConsumption;

  factory PantryLedgerConsumption.fromJson(Map<String, dynamic> json) =>
      _$PantryLedgerConsumptionFromJson(json);
}

/// 재료 하나의 전체 재고 차감 원장. [finalRemaining]이 음수가 되는 배치는
/// 검증 가드 V-04에서 거부된다 (명세 §4.2, §5).
@freezed
class PantryLedgerEntry with _$PantryLedgerEntry {
  const factory PantryLedgerEntry({
    @JsonKey(name: 'ingredient_id') required String ingredientId,
    @JsonKey(name: 'initial_quantity') required double initialQuantity,
    required String unit,
    required List<PantryLedgerConsumption> consumption,
    @JsonKey(name: 'final_remaining') required double finalRemaining,
    @JsonKey(name: 'fully_consumed_before_expiry') required bool fullyConsumedBeforeExpiry,
  }) = _PantryLedgerEntry;

  factory PantryLedgerEntry.fromJson(Map<String, dynamic> json) => _$PantryLedgerEntryFromJson(json);
}
