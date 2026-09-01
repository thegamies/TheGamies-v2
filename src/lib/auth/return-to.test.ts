import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";
import {
  buildAbsoluteAppUrl,
  buildEmailConfirmedCallbackUrl,
  buildSignInHref,
  buildSignUpHref,
  buildVerifyEmailHref,
  emailConfirmedCallbackPath,
  GOOGLE_COMPLETE_PROFILE_PATH,
  PASSWORD_RESET_PATH,
  resolvePostAuthRedirect,
  returnPathFromLocation,
  withAuthEntryRel,
} from "./return-to";

describe("withAuthEntryRel", () => {
  it("adds nofollow without duplicating", () => {
    expect(withAuthEntryRel()).toBe("nofollow");
    expect(withAuthEntryRel("nofollow")).toBe("nofollow");
    expect(withAuthEntryRel("noopener")).toBe("noopener nofollow");
  });
});

describe("safeNextPath", () => {
  it("allows relative paths only", () => {
    expect(safeNextPath("/l/abc")).toBe("/l/abc");
    expect(safeNextPath("//evil")).toBeNull();
    expect(safeNextPath("https://evil")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe("buildSignInHref / buildSignUpHref", () => {
  it("builds bare auth paths", () => {
    expect(buildSignInHref()).toBe("/auth/sign-in");
    expect(buildSignUpHref()).toBe("/auth/sign-up");
  });

  it("attaches next and intent", () => {
    const href = buildSignInHref({
      next: "/game-of-the-year/2026",
      intent: "save",
    });
    expect(href).toContain("/auth/sign-in?");
    expect(href).toContain("intent=save");
    expect(href).toContain(
      encodeURIComponent("/game-of-the-year/2026?intent=save"),
    );
  });

  it("builds sign-up with the same next", () => {
    expect(
      buildSignUpHref({ next: "/create/goty?year=2026", intent: "share" }),
    ).toContain("/auth/sign-up?");
  });

  it("builds verify-email with the address", () => {
    const href = buildVerifyEmailHref({
      email: "ada@example.com",
      next: "/account",
    });
    expect(href.startsWith("/auth/verify-email?")).toBe(true);
    expect(href).toContain("email=ada%40example.com");
    expect(href).toContain("next=");
  });

  it("builds an absolute callback URL", () => {
    expect(
      buildAbsoluteAppUrl("https://thegamies-v2.example.workers.dev", "/account"),
    ).toBe("https://thegamies-v2.example.workers.dev/account");
    expect(
      buildAbsoluteAppUrl("http://evil.example", "/account"),
    ).toBeNull();
  });

  it("builds an email-confirmed callback URL", () => {
    expect(
      buildEmailConfirmedCallbackUrl(
        "https://thegamies-v2.example.workers.dev",
        "/create/goty",
      ),
    ).toBe(
      "https://thegamies-v2.example.workers.dev/auth/confirmed?next=%2Fcreate%2Fgoty",
    );
  });

  it("builds a relative confirm-email callback path", () => {
    expect(emailConfirmedCallbackPath("/create/goty")).toBe(
      "/auth/confirmed?next=%2Fcreate%2Fgoty",
    );
  });

  it("exposes the relative password-reset path", () => {
    expect(PASSWORD_RESET_PATH).toBe("/auth/reset-password");
  });

  it("exposes the Google complete-profile path", () => {
    expect(GOOGLE_COMPLETE_PROFILE_PATH).toBe("/auth/complete-profile");
  });
});

describe("resolvePostAuthRedirect", () => {
  it("defaults to account", () => {
    expect(resolvePostAuthRedirect(null)).toBe("/account");
    expect(resolvePostAuthRedirect("https://evil")).toBe("/account");
  });

  it("returns next and merges intent", () => {
    expect(resolvePostAuthRedirect("/game-of-the-year/2026")).toBe(
      "/game-of-the-year/2026",
    );
    expect(resolvePostAuthRedirect("/create/goty?year=2026", "save")).toBe(
      "/create/goty?year=2026&intent=save",
    );
  });
});

describe("returnPathFromLocation", () => {
  it("skips auth routes", () => {
    expect(returnPathFromLocation("/auth/sign-in", "")).toBeNull();
    expect(returnPathFromLocation("/auth/sign-up", "next=%2F")).toBeNull();
  });

  it("keeps standings path and query", () => {
    expect(returnPathFromLocation("/game-of-the-year/2026", "")).toBe(
      "/game-of-the-year/2026",
    );
    expect(returnPathFromLocation("/create/goty", "year=2026")).toBe(
      "/create/goty?year=2026",
    );
  });
});
