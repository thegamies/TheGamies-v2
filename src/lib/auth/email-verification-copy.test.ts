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
