import 'package:flutter/widgets.dart';

/// 타이포 계층. 명세 §9.2. 폰트는 Pretendard(fallback SUIT/-apple-system/Roboto), 자간 상한 -0.2px.
/// 동적 타입 배율 0.85x~1.6x 지원 — 여기 정의된 fontSize는 스케일 이전 기준값이다.
abstract final class AppTypography {
  static const fontFamily = 'Pretendard';
  static const fontFamilyFallback = ['SUIT', '-apple-system', 'Roboto'];
  static const letterSpacingMax = -0.2;

  static const display = TextStyle(fontSize: 28, height: 36 / 28, fontWeight: FontWeight.w700);
  static const h1 = TextStyle(fontSize: 22, height: 30 / 22, fontWeight: FontWeight.w700);
  static const h2 = TextStyle(fontSize: 18, height: 26 / 18, fontWeight: FontWeight.w600);
  static const bodyL = TextStyle(fontSize: 16, height: 24 / 16, fontWeight: FontWeight.w400);
  static const bodyM = TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w400);
  static const caption = TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w500);
}
