import 'package:flutter/material.dart';

/// 끼니 카드 공통 위젯. 명세 §10 홈 — 식단 캘린더 예시 참고.
/// 메뉴명, 조리시간, kcal(기준 병기), meal_extra_cost 또는 '집에 있는 재료로 100%' 배지 표시.
/// 수치·금액·경고 문구는 절대 자르지 않는다 (§9.2 동적 타입 규칙).
/// TODO: 구현
class MealCard extends StatelessWidget {
  const MealCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
