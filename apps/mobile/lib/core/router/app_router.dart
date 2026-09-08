import 'package:go_router/go_router.dart';

import '../../features/family/presentation/family_screen.dart';
import '../../features/home_calendar/presentation/home_calendar_screen.dart';
import '../../features/onboarding/presentation/onboarding_flow_screen.dart';
import '../../features/pantry/presentation/pantry_screen.dart';
import '../../features/recipe/presentation/recipe_detail_screen.dart';
import '../../features/report_grocery/presentation/report_grocery_screen.dart';

/// 탭 구조: 탭1 식단 캘린더(홈) · 탭2 식재료 · 탭3 리포트 · 탭4 가족. 명세 §10.
/// TODO: 온보딩 완료 여부에 따른 초기 라우트 분기, 탭 셸(BottomNavigationBar) 구현
final appRouter = GoRouter(
  initialLocation: '/onboarding',
  routes: [
    GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingFlowScreen()),
    GoRoute(path: '/home', builder: (context, state) => const HomeCalendarScreen()),
    GoRoute(path: '/pantry', builder: (context, state) => const PantryScreen()),
    GoRoute(path: '/report', builder: (context, state) => const ReportGroceryScreen()),
    GoRoute(path: '/family', builder: (context, state) => const FamilyScreen()),
    GoRoute(
      path: '/recipe/:mealSlotId',
      builder: (context, state) => RecipeDetailScreen(mealSlotId: state.pathParameters['mealSlotId']!),
    ),
  ],
);
