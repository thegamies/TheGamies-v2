import { describe, expect, it } from "vitest";
import { isUnverifiedEmailError } from "./email-verification-copy";

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
