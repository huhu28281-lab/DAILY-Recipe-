import 'package:flutter/material.dart';

/// 탭1 식단 캘린더 (홈). 명세 §10 홈 — 식단 캘린더.
/// TODO: 주간 캘린더 스트립, 아침/저녁 끼니 카드, 오늘의 영양 바 구현
class HomeCalendarScreen extends StatelessWidget {
  const HomeCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('식단 캘린더')),
    );
  }
}
