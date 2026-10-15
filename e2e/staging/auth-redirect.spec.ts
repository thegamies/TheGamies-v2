import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { stagingBaseUrl, storageStatePath } from "./qa";

// Signed-in users with a profile are redirected straight to `next` here.
const ENTRY = "/auth/complete-profile";

const CASES: Array<{ next: string; expected: string }> = [
  { next: "/games", expected: "/games" },
  { next: "/create/goty?year=2026", expected: "/create/goty?year=2026" },
  { next: "/\\evil.com", expected: "/account" },
  { next: "//evil.com", expected: "/account" },
  { next: "/\t/evil.com", expected: "/account" },
  { next: "/%2F%2Fevil.com", expected: "/account" },
  { next: "/%5Cevil.com", expected: "/account" },
  { next: "https://evil.com", expected: "/account" },
];

test.describe("redirect after sign-in", () => {
  let api: APIRequestContext;

  test.beforeAll(async () => {
    api = await request.newContext({
      baseURL: stagingBaseUrl(),
      storageState: storageStatePath("host"),
    });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  for (const { next, expected } of CASES) {
    test(`next=${JSON.stringify(next)} stays on site at ${expected}`, async () => {
      const res = await api.get(`${ENTRY}?next=${encodeURIComponent(next)}`, {
        maxRedirects: 0,
      });
      expect(res.status(), "should redirect").toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      const location = res.headers()["location"] ?? "";
      const target = new URL(location, stagingBaseUrl());
      expect(target.origin).toBe(new URL(stagingBaseUrl()).origin);
      expect(`${target.pathname}${target.search}`).toBe(expected);
    });
  }
});

test("signed out, an unsafe next is dropped from the sign-in link", async () => {
  const api = await request.newContext({ baseURL: stagingBaseUrl() });
  try {
    const res = await api.get(
      `${ENTRY}?next=${encodeURIComponent("/\\evil.com")}`,
      { maxRedirects: 0 },
    );
    const target = new URL(res.headers()["location"] ?? "", stagingBaseUrl());
    expect(target.pathname).toBe("/auth/sign-in");
    expect(target.searchParams.get("next")).toBe("/account");
  } finally {
    await api.dispose();
  }
});
