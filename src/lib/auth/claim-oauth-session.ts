"use client";

import { authClient } from "./client";
import { GOOGLE_SIGN_IN_FAILED } from "./google-sign-in-client";
import { NEON_AUTH_SESSION_VERIFIER_PARAM } from "./neon-auth-session-verifier";

type SessionClient = {
  getSession: () => Promise<{
    data?: { user?: { id?: string } | null } | null;
    error?: unknown;
  }>;
};

/**
 * Ensure a session cookie exists after Google returns to this origin.
 *
 * Self-hosted Better Auth sets the cookie on `/api/auth/callback/google`
 * before landing on complete-profile (no verifier). Neon Managed Auth
 * returns `neon_auth_session_verifier` and needs an XHR claim so Set-Cookie
 * sticks (full-page redirects drop it).
 */
export async function claimNeonAuthSession(
  verifier: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const { data } = await (authClient as SessionClient).getSession();
    if (data?.user?.id) return { ok: true };
  } catch {
    // Fall through to the Neon verifier fetch when present.
  }

  const token = verifier.trim();
  if (!token) return { error: GOOGLE_SIGN_IN_FAILED };

  try {
    const response = await fetch(
      `/api/auth/get-session?${new URLSearchParams({
        [NEON_AUTH_SESSION_VERIFIER_PARAM]: token,
      }).toString()}`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return { error: GOOGLE_SIGN_IN_FAILED };
    const body = (await response.json()) as {
      user?: { id?: string } | null;
    };
    if (body?.user?.id) return { ok: true };
  } catch {
    // Same copy as a failed Google return.
  }
  return { error: GOOGLE_SIGN_IN_FAILED };
}
