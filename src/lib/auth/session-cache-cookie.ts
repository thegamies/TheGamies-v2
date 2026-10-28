/** Better Auth session cookies (self-hosted). */
export const BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
] as const;

/** Prefer the secure cookie name when listing cookies to expire. */
export const SESSION_TOKEN_COOKIE_NAME =
  BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES[0];

/**
 * Legacy Neon Auth cookie names. Still expired on sign-out so leftover
 * Managed Auth sessions cannot linger after cutover.
 */
export const LEGACY_NEON_AUTH_COOKIE_NAMES = [
  "__Secure-neon-auth.session_token",
  "__Secure-neon-auth.local.session_data",
  "neon-auth.session_token",
] as const;

/** @deprecated Prefer SESSION_TOKEN_COOKIE_NAME — kept for expire lists. */
export const SESSION_DATA_COOKIE_NAME =
  LEGACY_NEON_AUTH_COOKIE_NAMES[1];

export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function hasSessionTokenCookie(cookieHeader: string | null): boolean {
  for (const name of BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES) {
    const value = readCookie(cookieHeader, name);
    if (value !== null && value.length > 0) return true;
  }
  return false;
}
