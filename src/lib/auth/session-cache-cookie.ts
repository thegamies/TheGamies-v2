/** Signed session cache cookie. Matches `@neondatabase/auth` server constants. */
export const SESSION_DATA_COOKIE_NAME =
  "__Secure-neon-auth.local.session_data";

/** Primary Neon Auth session cookie. */
export const SESSION_TOKEN_COOKIE_NAME = "__Secure-neon-auth.session_token";

/**
 * Signed cache lifetime in seconds. The minute keepalive is longer than this,
 * so each visible-tab ping finds the cookie expired and has to mint a new one.
 */
export const SESSION_DATA_TTL_SEC = 30;

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
  return readCookie(cookieHeader, SESSION_TOKEN_COOKIE_NAME) !== null;
}
