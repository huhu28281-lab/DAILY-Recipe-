import { Hono } from "hono";

import type { Bindings } from "../index";

// 식재료 보관함: 보유 재료, 위시리스트, 재고 원장(ledger). 명세 §4.2.
const pantry = new Hono<{ Bindings: Bindings }>();

// TODO GET    /v1/pantry                 - 보유 재료 목록
// TODO POST   /v1/pantry                 - 재료 추가 (탭 시 기본 포장 단위 자동 적용)
// TODO PATCH  /v1/pantry/:ingredientId   - 수량/유통기한 수정
// TODO DELETE /v1/pantry/:ingredientId
// TODO GET    /v1/pantry/ledger/:planId  - 재고 차감 원장 조회

export default pantry;
