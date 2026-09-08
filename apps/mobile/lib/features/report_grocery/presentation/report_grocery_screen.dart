import 'package:flutter/material.dart';

/// 탭3 리포트. 명세 §10 리포트·장보기 (영양 탭 / 장보기 탭).
/// TODO: 주간 영양 달성률 바, 장보기 견적서, 포장 단위 고지 문구 구현
class ReportGroceryScreen extends StatelessWidget {
  const ReportGroceryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('주간 리포트')),
    );
  }
}
