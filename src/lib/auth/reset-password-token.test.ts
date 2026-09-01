import { describe, expect, it } from "vitest";
import {
  resetPasswordFormPath,
  tokenFromResetPasswordHref,
  tokenFromResetPasswordSegments,
} from "./reset-password-token";

describe("tokenFromResetPasswordSegments", () => {
  it("reads the path token Neon uses", () => {
    expect(
      tokenFromResetPasswordSegments(["reset-password", "KFsLY2b9lHmTgsviFkbrS7gR"]),
    ).toBe("KFsLY2b9lHmTgsviFkbrS7gR");
  });

  it("is off without a token segment", () => {
    expect(tokenFromResetPasswordSegments(["reset-password"])).toBeNull();
    expect(tokenFromResetPasswordSegments(["verify-email", "abc"])).toBeNull();
  });
});

describe("tokenFromResetPasswordHref", () => {
  it("prefers the webhook token", () => {
    expect(
      tokenFromResetPasswordHref(
        "https://ep-test.neon.tech/neondb/auth/reset-password/ignored",
        "payload-token",
      ),
    ).toBe("payload-token");
  });

  it("reads query and path tokens", () => {
    expect(
      tokenFromResetPasswordHref(
        "https://app.example/auth/reset-password?token=query-token",
      ),
    ).toBe("query-token");
    expect(
      tokenFromResetPasswordHref(
        "https://thegamies-v2-develop.ecdm981.workers.dev/api/auth/reset-password/KFsLY2b9lHmTgsviFkbrS7gR?callbackURL=https%3A%2F%2Fthegamies-v2-develop.ecdm981.workers.dev%2Fauth%2Freset-password",
      ),
    ).toBe("KFsLY2b9lHmTgsviFkbrS7gR");
  });
});

describe("resetPasswordFormPath", () => {
  it("keeps the token unused on the form page", () => {
    expect(resetPasswordFormPath("abc")).toBe("/auth/reset-password?token=abc");
  });
});
