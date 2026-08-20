import { describe, expect, it } from "vitest";
import { rewriteNeonAuthEmailHref } from "./auth-link";

const neon = "https://ep-test.neon.tech/neondb/auth/";
const app = "https://thegamies-v2-pr-12.example.workers.dev";

describe("rewriteNeonAuthEmailHref", () => {
  it("proxies a Neon verify-email link through the app auth handler", () => {
    const href = rewriteNeonAuthEmailHref(
      "https://ep-test.neon.tech/neondb/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Fthegamies.gg%2Faccount",
      { appOrigin: app, neonAuthBaseUrl: neon },
    );
    const url = new URL(href);
    expect(url.origin).toBe(app);
    expect(url.pathname).toBe("/api/auth/verify-email");
    expect(url.searchParams.get("token")).toBe("abc");
    expect(url.searchParams.get("callbackURL")).toBe(
      `${app}/account`,
    );
  });

  it("leaves non-Neon links alone", () => {
    const original = "https://thegamies.gg/auth/reset-password?token=abc";
    expect(
      rewriteNeonAuthEmailHref(original, {
        appOrigin: app,
        neonAuthBaseUrl: neon,
      }),
    ).toBe(original);
  });
});
