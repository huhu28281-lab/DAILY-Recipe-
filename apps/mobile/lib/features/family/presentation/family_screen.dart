import 'package:flutter/material.dart';

/// 탭4 가족. 명세 §4.1 가족 프로필.
/// TODO: 구성원 관리(최대 8인), 알레르기 검색·추가(민감정보 동의 시트), 활동량/영양 프로파일 설정 구현
class FamilyScreen extends StatelessWidget {
  const FamilyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('가족 프로필')),
    );
  }
}
