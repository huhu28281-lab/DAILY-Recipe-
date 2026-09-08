import { Hono } from "hono";

import type { Bindings } from "../index";

// 주간 리포트: 영양 목표 달성률(주간 평균), 냉장고 활용 지표. 명세 §2.2, §2.3, §4.7.
const report = new Hono<{ Bindings: Bindings }>();

// TODO GET /v1/report/:planId/nutrition   - weekly_nutrition_ratio, pantry_coverage_rate 등
// TODO GET /v1/report/history             - 주간 식단 12주 이력 조회

export default report;
