import { expect, request, test } from "@playwright/test";
import { stagingBaseUrl } from "./qa";

test("auth email webhook refuses an oversized body before signature work", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.post("/api/webhooks/neon-auth-email", {
      headers: { "content-type": "application/json" },
      data: "x".repeat(300 * 1024),
    });
    expect(res.status()).toBe(413);
  } finally {
    await api.dispose();
  }
});

test("auth email webhook still rejects an unsigned small body", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.post("/api/webhooks/neon-auth-email", {
      headers: { "content-type": "application/json" },
      data: "{}",
    });
    expect(res.status()).toBe(401);
  } finally {
    await api.dispose();
  }
});
