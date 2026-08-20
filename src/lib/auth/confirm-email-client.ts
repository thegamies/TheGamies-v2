"use client";

import { authClient } from "./client";

const CONFIRM_FAILED = "This confirmation link is missing or expired.";

type VerifyEmailClient = {
  verifyEmail?: (input: {
    query: { token: string };
  }) => Promise<{ error?: { message?: string } | null }>;
};

/**
 * Verify on this origin with an XHR so Set-Cookie lands on the document.
 * A full navigation through `/api/auth/verify-email` 302s away before the
 * session cookie is stored.
 */
export async function confirmEmailWithToken(
  token: string,
): Promise<{ ok: true } | { error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { error: CONFIRM_FAILED };

  const verify = (authClient as VerifyEmailClient).verifyEmail;
  if (typeof verify === "function") {
    const { error } = await verify({ query: { token: trimmed } });
    if (!error) return { ok: true };
  }

  try {
    const response = await fetch(
      `/api/auth/verify-email?${new URLSearchParams({ token: trimmed }).toString()}`,
      {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      },
    );
    if (response.ok) return { ok: true };
  } catch {
    // Fall through to the same expired-link copy.
  }
  return { error: CONFIRM_FAILED };
}
