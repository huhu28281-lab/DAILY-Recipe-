import 'package:flutter/material.dart';

/// 첫 실행 3단계 흐름. 명세 §3 입력 최소화 설계.
/// [1] 인원수 선택 → [2] 자주 쓰는 재료 20개 그리드 → [3] 식단 만들기
/// 재료 3개만 탭해도 식단이 나오는 최소 경로를 보장해야 한다.
/// TODO: 구현
class OnboardingFlowScreen extends StatelessWidget {
  const OnboardingFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('온보딩')),
    );
  }
}
