import { beforeEach, describe, expect, it, vi } from "vitest";

const signInSocial = vi.fn();

vi.mock("./client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

import {
  GOOGLE_ACCOUNT_NOT_LINKED,
  GOOGLE_SIGN_IN_FAILED,
  googleOAuthReturnMessage,
  signInWithGoogle,
} from "./google-sign-in-client";
import { GOOGLE_COMPLETE_PROFILE_PATH } from "./return-to";

describe("signInWithGoogle", () => {
  beforeEach(() => {
    signInSocial.mockReset();
  });

  it("starts Google OAuth through the Auth proxy", async () => {
    signInSocial.mockResolvedValueOnce({
      data: { url: "https://accounts.google.com/o/oauth2" },
      error: null,
    });
    await expect(
      signInWithGoogle({ errorCallbackPath: "/auth/sign-up" }),
    ).resolves.toEqual({ href: "https://accounts.google.com/o/oauth2" });
    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      newUserCallbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      errorCallbackURL: "/auth/sign-up",
    });
  });

  it("returns product copy when Google OAuth fails", async () => {
    signInSocial.mockResolvedValueOnce({
      error: { message: "OAuth not configured" },
    });
    await expect(signInWithGoogle({})).resolves.toEqual({
      error: "OAuth not configured",
    });
  });

  it("hides JSON Auth failures", async () => {
    signInSocial.mockResolvedValueOnce({
      error: {
        code: "INVALID_CALLBACK_URL",
        message: '{"code":"INVALID_CALLBACK_URL"}',
      },
    });
    await expect(signInWithGoogle({})).resolves.toEqual({
      error: GOOGLE_SIGN_IN_FAILED,
    });
  });
});

describe("googleOAuthReturnMessage", () => {
  it("explains an unlinked Google email", () => {
    expect(googleOAuthReturnMessage("account_not_linked")).toBe(
      GOOGLE_ACCOUNT_NOT_LINKED,
    );
  });

  it("uses generic copy for other return errors", () => {
    expect(googleOAuthReturnMessage("access_denied")).toBe(
      GOOGLE_SIGN_IN_FAILED,
    );
    expect(googleOAuthReturnMessage(null)).toBeNull();
  });
});
