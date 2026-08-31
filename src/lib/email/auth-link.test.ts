import { describe, expect, it } from "vitest";
import { confirmationPageHref, resetPasswordPageHref, rewriteNeonAuthEmailHref } from "./auth-link";

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

describe("confirmationPageHref", () => {
  it("sends confirm-email clicks to the app with the token still unused", () => {
    const callback = encodeURIComponent(
      "https://thegamies.gg/auth/confirmed?next=/create/goty",
    );
    const href = confirmationPageHref(
      `https://ep-test.neon.tech/neondb/auth/verify-email?token=abc&callbackURL=${callback}`,
      { appOrigin: app, neonAuthBaseUrl: neon },
    );
    const url = new URL(href);
    expect(url.origin).toBe(app);
    expect(url.pathname).toBe("/auth/confirmed");
    expect(url.searchParams.get("token")).toBe("abc");
    expect(url.searchParams.get("next")).toBe("/create/goty");
  });
});

describe("resetPasswordPageHref", () => {
  it("sends reset-password clicks to the app with the token still unused", () => {
    const href = resetPasswordPageHref(
      "https://ep-test.neon.tech/neondb/auth/reset-password?token=abc&redirectTo=%2Fauth%2Freset-password",
      { appOrigin: app, neonAuthBaseUrl: neon },
    );
    const url = new URL(href);
    expect(url.origin).toBe(app);
    expect(url.pathname).toBe("/auth/reset-password");
    expect(url.searchParams.get("token")).toBe("abc");
  });

  it("reads the token from the Neon path", () => {
    const href = resetPasswordPageHref(
      "https://ep-test.neon.tech/neondb/auth/reset-password/KFsLY2b9lHmTgsviFkbrS7gR?callbackURL=https%3A%2F%2Fthegamies-v2-develop.ecdm981.workers.dev%2Fauth%2Freset-password",
      { appOrigin: app, neonAuthBaseUrl: neon },
    );
    expect(href).toBe(`${app}/auth/reset-password?token=KFsLY2b9lHmTgsviFkbrS7gR`);
  });
});
