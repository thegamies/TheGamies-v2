import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";
import {
  buildSignInHref,
  buildSignUpHref,
  buildVerifyEmailAbsoluteHref,
  buildVerifyEmailHref,
  resolvePostAuthRedirect,
  returnPathFromLocation,
} from "./return-to";

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

  it("builds an absolute confirm URL with the code", () => {
    expect(
      buildVerifyEmailAbsoluteHref("https://thegamies-v2.example.workers.dev", {
        email: "ada@example.com",
        otp: "654321",
      }),
    ).toBe(
      "https://thegamies-v2.example.workers.dev/auth/verify-email?email=ada%40example.com&otp=654321",
    );
    expect(
      buildVerifyEmailAbsoluteHref("http://evil.example", {
        email: "ada@example.com",
        otp: "1",
      }),
    ).toBeNull();
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
