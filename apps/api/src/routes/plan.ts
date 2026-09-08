import { Hono } from "hono";

import type { Bindings } from "../index";

// 식단 생성/조회/Swap. 명세 §4.3~4.5, 생성 파이프라인 §5.
const plan = new Hono<{ Bindings: Bindings }>();

// TODO POST /v1/plan/generate        - 파이프라인 6단계 실행 (src/pipeline)
// TODO GET  /v1/plan/:planId         - 주간 식단 조회
// TODO POST /v1/plan/:planId/swap    - 끼니 교체 트랜잭션 (§4.5, 주당 20회 제한)

export default plan;
