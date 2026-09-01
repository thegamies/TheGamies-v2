import { describe, expect, it } from "vitest";
import {
  shouldPromptConfirmEmail,
  signUpHasSession,
} from "./confirm-email-prompt";

describe("signUpHasSession", () => {
  it("is on when Neon already issued a session or token", () => {
    expect(signUpHasSession({ session: { id: "s1" } })).toBe(true);
    expect(signUpHasSession({ token: "abc" })).toBe(true);
  });

  it("is off without a session", () => {
    expect(signUpHasSession(null)).toBe(false);
    expect(signUpHasSession({})).toBe(false);
    expect(signUpHasSession({ token: "" })).toBe(false);
    expect(signUpHasSession({ token: null })).toBe(false);
  });
});

describe("shouldPromptConfirmEmail", () => {
  it("skips the screen when Neon confirm-email is off", () => {
    expect(
      shouldPromptConfirmEmail({
        emailVerified: false,
        hasSession: true,
      }),
    ).toBe(false);
  });

  it("prompts only when the account is unverified and cannot proceed", () => {
    expect(
      shouldPromptConfirmEmail({
        emailVerified: false,
        hasSession: false,
      }),
    ).toBe(true);
  });

  it("does not prompt a verified account", () => {
    expect(
      shouldPromptConfirmEmail({
        emailVerified: true,
        hasSession: false,
      }),
    ).toBe(false);
  });
});
