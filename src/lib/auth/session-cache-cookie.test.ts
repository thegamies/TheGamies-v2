import { describe, expect, it } from "vitest";
import { SESSION_KEEPALIVE_INTERVAL_MS } from "@/lib/auth/session-keepalive";
import {
  SESSION_CACHE_REFRESH_WITHIN_SEC,
  SESSION_DATA_COOKIE_NAME,
  SESSION_DATA_TTL_SEC,
  SESSION_TOKEN_COOKIE_NAME,
  cookieHeaderWithoutSessionData,
  hasSessionTokenCookie,
  requestWithRefreshedSessionCache,
  sessionCacheNeedsRefresh,
  sessionDataExpiresAtSec,
} from "@/lib/auth/session-cache-cookie";

function jwt(exp: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.sig`;
}

const nowMs = 1_700_000_000_000;

describe("session cache cookie", () => {
  it("keeps the keepalive ping inside the refresh window", () => {
    const remainingAtPing =
      SESSION_DATA_TTL_SEC - SESSION_KEEPALIVE_INTERVAL_MS / 1000;
    expect(remainingAtPing).toBeLessThanOrEqual(SESSION_CACHE_REFRESH_WITHIN_SEC);
    expect(remainingAtPing).toBeGreaterThan(0);
  });

  it("reads exp from the signed cache cookie", () => {
    expect(sessionDataExpiresAtSec(jwt(nowMs / 1000 + 30))).toBe(
      nowMs / 1000 + 30,
    );
    expect(sessionDataExpiresAtSec("not-a-jwt")).toBeNull();
  });

  it("refreshes only when the cache is inside the last window", () => {
    const token = `${SESSION_TOKEN_COOKIE_NAME}=tok`;
    const soon = `${token}; ${SESSION_DATA_COOKIE_NAME}=${jwt(nowMs / 1000 + 30)}`;
    const fresh = `${token}; ${SESSION_DATA_COOKIE_NAME}=${jwt(nowMs / 1000 + 200)}`;
    expect(sessionCacheNeedsRefresh(soon, nowMs)).toBe(true);
    expect(sessionCacheNeedsRefresh(fresh, nowMs)).toBe(false);
    expect(hasSessionTokenCookie(token)).toBe(true);
    expect(hasSessionTokenCookie("other=1")).toBe(false);
  });

  it("drops only the cache cookie when re-minting", () => {
    const header = `a=1; ${SESSION_DATA_COOKIE_NAME}=stale; ${SESSION_TOKEN_COOKIE_NAME}=tok`;
    expect(cookieHeaderWithoutSessionData(header)).toBe(
      `a=1; ${SESSION_TOKEN_COOKIE_NAME}=tok`,
    );
  });

  it("asks the get-session handler to re-mint a near-expiry cache", () => {
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=${jwt(nowMs / 1000 + 30)}`;
    const request = new Request("https://thegamies.gg/api/auth/get-session", {
      headers: { cookie },
    });
    const next = requestWithRefreshedSessionCache(request, nowMs);
    expect(next.headers.get("cookie")).toBe(`${SESSION_TOKEN_COOKIE_NAME}=tok`);
  });

  it("leaves a fresh cache and OAuth verifier exchanges unchanged", () => {
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=${jwt(nowMs / 1000 + 200)}`;
    const fresh = new Request("https://thegamies.gg/api/auth/get-session", {
      headers: { cookie },
    });
    expect(requestWithRefreshedSessionCache(fresh, nowMs)).toBe(fresh);

    const oauth = new Request(
      "https://thegamies.gg/api/auth/get-session?neon_auth_session_verifier=abc",
      { headers: { cookie: `${SESSION_DATA_COOKIE_NAME}=${jwt(nowMs / 1000 + 10)}` } },
    );
    expect(requestWithRefreshedSessionCache(oauth, nowMs)).toBe(oauth);
  });
});
