import 'package:flutter/material.dart';

/// 레시피 상세 — 인분 스케일링. 명세 §4.6.
/// 일괄 곱셈 금지: 재료군별 비선형 스케일링 함수(q×n, q×n^0.75 등) 적용, 타이머는 파싱 성공 시에만 노출.
/// TODO: 구현
class RecipeDetailScreen extends StatelessWidget {
  const RecipeDetailScreen({super.key, required this.mealSlotId});

  final String mealSlotId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('레시피: $mealSlotId')),
    );
  }
}
