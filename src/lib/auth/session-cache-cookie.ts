/** Signed session cache cookie. Matches `@neondatabase/auth` server constants. */
export const SESSION_DATA_COOKIE_NAME =
  "__Secure-neon-auth.local.session_data";

/** Primary Neon Auth session cookie. */
export const SESSION_TOKEN_COOKIE_NAME = "__Secure-neon-auth.session_token";

/** Better Auth session cookies (self-hosted). */
export const BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
] as const;

/** Signed cache lifetime in seconds. A fresh cookie skips Neon on navigation. */
export const SESSION_DATA_TTL_SEC = 4 * 60 * 60;

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
  const neon = readCookie(cookieHeader, SESSION_TOKEN_COOKIE_NAME);
  if (neon !== null && neon.length > 0) return true;
  for (const name of BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES) {
    const value = readCookie(cookieHeader, name);
    if (value !== null && value.length > 0) return true;
  }
  return false;
}
