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
 * Exchange Neon’s OAuth return token for a session cookie on this origin.
 * Full-page redirects drop Set-Cookie; same as confirm-email.
 */
export async function claimNeonAuthSession(
  verifier: string,
): Promise<{ ok: true } | { error: string }> {
  const token = verifier.trim();
  if (!token) return { error: GOOGLE_SIGN_IN_FAILED };

  try {
    const { data } = await (authClient as SessionClient).getSession();
    if (data?.user?.id) return { ok: true };
  } catch {
    // Fall through to the explicit get-session fetch.
  }

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
