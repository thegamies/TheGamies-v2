import { expect, request, test } from "@playwright/test";
import { stagingBaseUrl } from "./qa";

// Signed out on purpose: the origin check runs before the session check, and
// with no session nothing can be deleted.
test("account delete refuses a foreign origin even with a forged forwarded host", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.post("/api/account/delete", {
      headers: {
        origin: "https://evil.example",
        "x-forwarded-host": "evil.example",
      },
      multipart: { password: "not-a-real-password" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
  } finally {
    await api.dispose();
  }
});

test("account delete from the site's own origin reaches the session check", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.post("/api/account/delete", {
      headers: { origin: stagingBaseUrl() },
      multipart: { password: "not-a-real-password" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  } finally {
    await api.dispose();
  }
});
