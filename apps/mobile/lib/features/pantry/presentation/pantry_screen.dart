import 'package:flutter/material.dart';

/// 탭2 식재료. 명세 §4.2 식재료 보관함.
/// TODO: 보유 재료 목록, D-3 임박 플래그, 위시리스트, 제철 재료 큐레이션 구현
class PantryScreen extends StatelessWidget {
  const PantryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('식재료 보관함')),
    );
  }
}
