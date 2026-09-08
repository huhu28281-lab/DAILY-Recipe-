/// 계산 기준 상수. 명세 §2.1, §2.3. 이 파일과 서버(§5 파이프라인)의 값이 어긋나면 안 된다.
abstract final class NutritionConstants {
  // 끼니 배분 (§2.1) — 앱이 관리하는 건 아침+저녁 60%뿐이다.
  static const breakfastRatio = 0.25;
  static const lunchRatio = 0.40;
  static const dinnerRatio = 0.35;

  // 활동량 계수
  static const activityLight = 0.9;
  static const activityModerate = 1.0;
  static const activityActive = 1.15;

  // 영양 프로파일별 탄/단/지 비율 (§2.3)
  static const standardRatio = {'carb': 0.58, 'protein': 0.18, 'fat': 0.24};
  static const growthBoostRatio = {'carb': 0.55, 'protein': 0.20, 'fat': 0.25};
  static const weightLossRatio = {'carb': 0.50, 'protein': 0.25, 'fat': 0.25};
  static const glucoseConsciousRatio = {'carb': 0.50, 'protein': 0.20, 'fat': 0.30};

  // 냉장고 활용 지표 목표 (§2.2)
  static const pantryCoverageTarget = 0.60;
  static const expiryPriorityTarget = 0.90;
}
