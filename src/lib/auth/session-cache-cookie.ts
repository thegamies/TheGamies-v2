import { NEON_AUTH_SESSION_VERIFIER_PARAM } from "@/lib/auth/neon-auth-session-verifier";

/** Signed session cache cookie. Matches `@neondatabase/auth` server constants. */
export const SESSION_DATA_COOKIE_NAME =
  "__Secure-neon-auth.local.session_data";

/** Primary Neon Auth session cookie. */
export const SESSION_TOKEN_COOKIE_NAME = "__Secure-neon-auth.session_token";

/** Default `cookies.sessionDataTtl`. The signed cache expires after this. */
export const SESSION_DATA_TTL_SEC = 300;

/**
 * Re-mint the cache cookie while it is still valid. The keepalive interval
 * is 4 minutes, so about 60 seconds of the 5-minute TTL remain at that ping.
 */
export const SESSION_CACHE_REFRESH_WITHIN_SEC = 90;

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

/** JWT `exp` (seconds) from the signed session-cache cookie, if it parses. */
export function sessionDataExpiresAtSec(value: string): number | null {
  const payload = value.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof json.exp === "number" && Number.isFinite(json.exp)
      ? json.exp
      : null;
  } catch {
    return null;
  }
}

export function sessionCacheNeedsRefresh(
  cookieHeader: string | null,
  nowMs: number,
): boolean {
  const value = readCookie(cookieHeader, SESSION_DATA_COOKIE_NAME);
  if (!value) return false;
  const exp = sessionDataExpiresAtSec(value);
  if (exp === null) return false;
  const remaining = exp - nowMs / 1000;
  return remaining <= SESSION_CACHE_REFRESH_WITHIN_SEC;
}

/** Drop the cache cookie so the Auth handler mints a new one. */
export function cookieHeaderWithoutSessionData(
  cookieHeader: string,
): string | null {
  const kept: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = eq <= 0 ? trimmed : trimmed.slice(0, eq);
    if (name === SESSION_DATA_COOKIE_NAME) continue;
    kept.push(trimmed);
  }
  return kept.length > 0 ? kept.join("; ") : null;
}

/**
 * When the signed cache is near expiry, omit it so `/get-session` re-mints
 * from the route handler (where Set-Cookie sticks). A fresh cache is unchanged
 * and is served locally. OAuth verifier exchanges are left alone.
 */
export function requestWithRefreshedSessionCache(
  request: Request,
  nowMs: number = Date.now(),
): Request {
  const url = new URL(request.url);
  if (url.searchParams.has(NEON_AUTH_SESSION_VERIFIER_PARAM)) return request;
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader || !sessionCacheNeedsRefresh(cookieHeader, nowMs)) {
    return request;
  }
  const nextCookie = cookieHeaderWithoutSessionData(cookieHeader);
  const headers = new Headers(request.headers);
  if (nextCookie) headers.set("cookie", nextCookie);
  else headers.delete("cookie");
  return new Request(request, { headers });
}

function decodeBase64Url(value: string): string {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}
