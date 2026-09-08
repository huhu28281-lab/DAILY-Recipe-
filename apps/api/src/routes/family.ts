import { Hono } from "hono";

import type { Bindings } from "../index";

// 가족 프로필: 구성원, 알레르기, 목표 칼로리 자동 산출. 명세 §4.1.
const family = new Hono<{ Bindings: Bindings }>();

// TODO GET    /v1/family/members            - 구성원 목록
// TODO POST   /v1/family/members            - 구성원 추가 (최대 8인)
// TODO PATCH  /v1/family/members/:memberId  - 연령대/성별/활동량 수정 → 목표 kcal 재계산
// TODO GET    /v1/family/allergen-master    - 서버 설정 기반 22종 알레르기 목록 (하드코딩 금지, §4.1)

export default family;
