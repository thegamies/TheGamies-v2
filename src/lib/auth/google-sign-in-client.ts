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

export { withGoogleAccountPicker } from "./google-account-picker";

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
 * Start Google OAuth through the Auth proxy so the session cookie lands here.
 * Neon then returns to `/auth/complete-profile`.
 */
export type GoogleSignInLaunch = {
  href: string;
  /**
   * Auth-host URL that must load in a window before `href`, so the state
   * cookie exists when Google returns.
   */
  plant?: string;
};

async function resolveAccountChooserUrl(initUrl: string): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/google-authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ url: initUrl }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { href?: unknown };
    return typeof json.href === "string" && json.href.trim()
      ? json.href.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Opens during the click, before the auth request, so the browser allows it.
 * The window only exists long enough for the auth host to store its cookie.
 */
export function openGoogleSignInWindow(win: Window = window): Window | null {
  const popup = win.open("about:blank", "google-sign-in");
  if (!popup) return null;
  try {
    popup.document.title = "Continuing with Google";
    const line = popup.document.createElement("p");
    line.textContent = "Continuing with Google…";
    popup.document.body.replaceChildren(line);
  } catch {
    // The window can still be navigated.
  }
  return popup;
}

export async function googleSignInLaunch(
  authUrl: string,
  resolve: (initUrl: string) => Promise<string | null> = resolveAccountChooserUrl,
): Promise<GoogleSignInLaunch> {
  let host = "";
  try {
    host = new URL(authUrl).hostname;
  } catch {
    return { href: authUrl };
  }
  if (isGoogleAuthorizeHost(host)) {
    return { href: withGoogleAccountPicker(authUrl) };
  }
  const chooser = await resolve(authUrl);
  if (!chooser) return { href: authUrl };
  return { href: chooser, plant: authUrl };
}

/** Let the helper window finish storing the auth cookie before it closes. */
const GOOGLE_INIT_SETTLE_MS = 75;

function authHopAlreadyReturned(helper: Window, win: Window): boolean {
  try {
    const href = helper.location.href;
    return href.startsWith(win.location.origin);
  } catch {
    return false;
  }
}

/**
 * Send this window to Google's account chooser. When the auth host sits in
 * front of Google, `popup` loads that hop first so the state cookie exists,
 * then this window continues to the chooser.
 */
export function launchGoogleSignIn(
  target: GoogleSignInLaunch,
  popup: Window | null = null,
  win: Window = window,
): void {
  if (!target.plant) {
    if (popup && !popup.closed) popup.close();
    win.location.assign(target.href);
    return;
  }

  const plant = target.plant;
  const helper =
    popup && !popup.closed ? popup : win.open("about:blank", "google-sign-in");
  if (!helper) {
    win.location.assign(plant);
    return;
  }

  try {
    helper.location.replace(plant);
  } catch {
    try {
      helper.close();
    } catch {
      // This window still continues below.
    }
    win.location.assign(plant);
    return;
  }

  // The helper starts first. When a second request for the same hop returns,
  // the cookie is stored and Google has not finished signing the last account
  // back in. Close the helper and ask Google which account to use.
  setTimeout(() => {
    void fetch(plant, { credentials: "omit", redirect: "manual" }).finally(
      () => {
        setTimeout(() => {
          if (helper.closed) return;
          if (authHopAlreadyReturned(helper, win)) {
            helper.focus();
            return;
          }
          try {
            helper.close();
          } catch {
            // This window still continues below.
          }
          win.location.assign(target.href);
        }, GOOGLE_INIT_SETTLE_MS);
      },
    );
  }, 0);
}

export async function signInWithGoogle(input: {
  errorCallbackPath?: string;
}): Promise<{ error: string } | GoogleSignInLaunch | { redirected: true }> {
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
    if (href) return googleSignInLaunch(href);
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
