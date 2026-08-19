import { describe, expect, it } from "vitest";
import { PASSWORD_HELPER, validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts eight characters with a letter and a number", () => {
    expect(validatePassword("secret12")).toEqual({ ok: true });
  });

  it("rejects short, letter-only, and number-only passwords", () => {
    expect(validatePassword("ab12")).toEqual({
      ok: false,
      message: PASSWORD_HELPER,
    });
    expect(validatePassword("abcdefgh")).toEqual({
      ok: false,
      message: PASSWORD_HELPER,
    });
    expect(validatePassword("12345678")).toEqual({
      ok: false,
      message: PASSWORD_HELPER,
    });
  });
});
