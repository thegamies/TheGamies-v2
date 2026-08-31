import { describe, expect, it } from "vitest";
import {
  isUnverifiedEmailError,
  publicAuthErrorMessage,
} from "./email-verification-copy";

describe("isUnverifiedEmailError", () => {
  it("matches Neon Auth codes and copy", () => {
    expect(
      isUnverifiedEmailError({ code: "EMAIL_NOT_VERIFIED" }),
    ).toBe(true);
    expect(
      isUnverifiedEmailError({ message: "Please verify your email" }),
    ).toBe(true);
    expect(isUnverifiedEmailError({ message: "Wrong password" })).toBe(false);
  });

  it("matches JSON-wrapped verification errors", () => {
    expect(
      isUnverifiedEmailError({
        message:
          '{"message":"Email verification required","code":"EMAIL_NOT_VERIFIED"}',
      }),
    ).toBe(true);
    expect(
      isUnverifiedEmailError({
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Please confirm your email",
      }),
    ).toBe(true);
  });
});

describe("publicAuthErrorMessage", () => {
  it("hides Neon redirect allowlist failures", () => {
    expect(
      publicAuthErrorMessage(
        {
          code: "INVALID_REDIRECT_URL",
          message: '{"message":"Invalid redirectURL","code":"INVALID_REDIRECT_URL"}',
        },
        "Could not create account.",
      ),
    ).toBe("Could not create account.");
    expect(
      publicAuthErrorMessage(
        { message: "Invalid redirectURL" },
        "Could not create account.",
      ),
    ).toBe("Could not create account.");
  });

  it("keeps ordinary Auth copy", () => {
    expect(
      publicAuthErrorMessage(
        { message: "User already exists" },
        "Could not create account.",
      ),
    ).toBe("User already exists");
  });
});
