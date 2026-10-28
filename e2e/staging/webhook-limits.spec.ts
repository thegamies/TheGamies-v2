import { expect, request, test } from "@playwright/test";
import { stagingBaseUrl } from "./qa";

test("edition freeze cron refuses an unsigned request", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.post("/api/cron/edition-freeze", {
      headers: { "content-type": "application/json" },
      data: "{}",
    });
    expect([401, 403, 405]).toContain(res.status());
  } finally {
    await api.dispose();
  }
});
