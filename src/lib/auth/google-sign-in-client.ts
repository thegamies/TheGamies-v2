"use client";

import { authClient } from "./client";
import { publicAuthErrorMessage } from "./email-verification-copy";
import {
  GOOGLE_ACCOUNT_PROMPT,
  isGoogleAuthorizeHost,
  withGoogleAccountPicker,
} from "./google-account-picker";
import { GOOGLE_COMPLETE_PROFILE_PATH } from "./return-to";
import { safeNextPath } from "./safe-next";

export const GOOGLE_SIGN_IN_FAILED = "Could not continue with Google.";

export const GOOGLE_ACCOUNT_NOT_LINKED =
  "That email already has an account. Sign in with your password.";

/** Product copy after Google sends the browser back with `?error=`. */
export function googleOAuthReturnMessage(
  errorParam: string | null | undefined,
): string | null {
  const code = errorParam?.trim();
  if (!code) return null;
  if (code === "account_not_linked") return GOOGLE_ACCOUNT_NOT_LINKED;
  return GOOGLE_SIGN_IN_FAILED;
}

type SocialSignInClient = {
  signIn: {
    social: (input: {
      provider: "google";
      callbackURL: string;
      newUserCallbackURL?: string;
      errorCallbackURL?: string;
      disableRedirect?: boolean;
      additionalParams?: { prompt: string };
    }) => Promise<{
      error?: { message?: string; code?: string } | null;
      data?: { url?: string } | null;
    }>;
  };
};

/**
 * Better Auth adds the account list when this URL is already Google's.
 * Neon's URL must be opened as issued: one visit stores the sign-in cookie
 * and continues to Google. Rewriting it drops that cookie.
 */
export function googleContinueUrl(authUrl: string): string {
  try {
    if (isGoogleAuthorizeHost(new URL(authUrl).hostname)) {
      return withGoogleAccountPicker(authUrl);
    }
  } catch {
    return authUrl;
  }
  return authUrl;
}

/**
 * Start Google OAuth through the Auth proxy so the session cookie lands here.
 * Neon then returns to `/auth/complete-profile`.
 */
export async function signInWithGoogle(input: {
  errorCallbackPath?: string;
}): Promise<{ error: string } | { href: string } | { redirected: true }> {
  const errorCallbackURL =
    safeNextPath(input.errorCallbackPath) ?? "/auth/sign-in";

  try {
    const { error, data } = await (
      authClient as SocialSignInClient
    ).signIn.social({
      provider: "google",
      callbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      newUserCallbackURL: GOOGLE_COMPLETE_PROFILE_PATH,
      errorCallbackURL,
      disableRedirect: true,
      additionalParams: { prompt: GOOGLE_ACCOUNT_PROMPT },
    });
    if (error) {
      return {
        error: publicAuthErrorMessage(error, GOOGLE_SIGN_IN_FAILED),
      };
    }
    const href = data?.url?.trim();
    if (href) return { href: googleContinueUrl(href) };
    return { redirected: true };
  } catch (thrown) {
    const error =
      thrown && typeof thrown === "object"
        ? (thrown as { message?: string; code?: string })
        : { message: thrown instanceof Error ? thrown.message : String(thrown) };
    return {
      error: publicAuthErrorMessage(error, GOOGLE_SIGN_IN_FAILED),
    };
  }
}
