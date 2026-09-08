import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// 라이트/다크 ThemeData. 명세 §9.1, §9.3(8pt 그리드, 곡률), §9.4(모션).
/// TODO: 컴포넌트별 세부 테마(카드, 칩, 바텀시트) 확장
abstract final class AppTheme {
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.bgBase,
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary500,
          surface: AppColors.surface,
          onSurface: AppColors.textMain,
        ),
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFamilyFallback,
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.darkBgBase,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.darkPrimary,
          surface: AppColors.darkSurface,
          onSurface: AppColors.darkTextMain,
        ),
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFamilyFallback,
      );
}
