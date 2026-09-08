import { Hono } from "hono";

import type { Bindings } from "../index";

// 장보기 견적서: 포장 단위 올림 합계, 가격 미확인 품목 표시. 명세 §2.4, §10 리포트·장보기.
const grocery = new Hono<{ Bindings: Bindings }>();

// TODO GET /v1/grocery/:planId          - 장보기 목록 + grocery_total_cost_krw
// TODO GET /v1/grocery/:planId/export   - 텍스트/PNG/PDF 내보내기

export default grocery;
