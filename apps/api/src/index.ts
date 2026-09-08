import { Hono } from "hono";

import family from "./routes/family";
import grocery from "./routes/grocery";
import pantry from "./routes/pantry";
import plan from "./routes/plan";
import report from "./routes/report";

export type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  ENVIRONMENT: string;
  PRICE_REFERENCE_SOURCE: string;
  SWAP_WEEKLY_LIMIT: string;
  LLM_API_KEY: string;
  KAMIS_API_KEY: string;
  AT_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/v1/plan", plan);
app.route("/v1/pantry", pantry);
app.route("/v1/family", family);
app.route("/v1/grocery", grocery);
app.route("/v1/report", report);

export default {
  fetch: app.fetch,

  // §2.4: KAMIS/aT 가격 DB 주 1회 배치 갱신 (wrangler.toml [triggers] 참고)
  async scheduled(_controller: ScheduledController, _env: Bindings, _ctx: ExecutionContext) {
    // TODO: 가격 배치 갱신 작업 연결 (src/services/pricing.ts)
  },
};
