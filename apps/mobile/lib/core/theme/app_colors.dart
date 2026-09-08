import 'package:flutter/widgets.dart';

/// 디자인 시스템 컬러 토큰. 명세 §9.1.
/// 시맨틱 색상은 배경용과 텍스트용을 분리한다 — 흰 배경 위 텍스트는 항상 텍스트용 값을 쓴다.
abstract final class AppColors {
  // 기본 (라이트)
  static const primary500 = Color(0xFF2D6A4F);
  static const primary100 = Color(0xFFD8F3DC);
  static const bgBase = Color(0xFFF9FAF8);
  static const surface = Color(0xFFFFFFFF);
  static const textMain = Color(0xFF1E2421);
  static const textSub = Color(0xFF6C757D);
  static const border = Color(0xFFE5E9E5);

  // 시맨틱 — 배경/아이콘용
  static const statusGoodSurface = Color(0xFF38B000);
  static const statusWarnSurface = Color(0xFFFFB703);
  static const statusDangerSurface = Color(0xFFE63946);

  // 시맨틱 — 텍스트용 (대비 4.5:1 이상 보장)
  static const statusGoodText = Color(0xFF1B7F3B);
  static const statusWarnText = Color(0xFF8A5A00);
  static const statusDangerText = Color(0xFFC1121F);

  // 재료 상태
  static const ownedSurface = Color(0xFF2A9D8F);
  static const ownedText = Color(0xFF1D7A70);
  static const needToBuySurface = Color(0xFFE76F51);
  static const needToBuyText = Color(0xFFB23A20);
  static const seasonalSurface = Color(0xFFF4A261);
  static const seasonalText = Color(0xFF8A5A00);

  // 끼니 시간대
  static const mealMorning = Color(0xFFF4A261);
  static const mealEvening = Color(0xFFE76F51);

  // 다크 모드
  static const darkBgBase = Color(0xFF121614);
  static const darkSurface = Color(0xFF1E2522);
  static const darkTextMain = Color(0xFFE8ECE9);
  static const darkTextSub = Color(0xFFA3ADA7);
  static const darkPrimary = Color(0xFF40916C);
  static const darkStatusGoodText = Color(0xFF5FD97F);
  static const darkStatusWarnText = Color(0xFFFFC94D);
  static const darkStatusDangerText = Color(0xFFFF6B75);
  static const darkOwnedText = Color(0xFF4FC9BA);
  static const darkNeedToBuyText = Color(0xFFFF8F6E);
}
