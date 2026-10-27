import {
  handleAuthProxyRequest,
  validateSessionData,
} from "@neondatabase/auth/server";
import {
  clientIpFromHeaders,
  shareInflight,
  withAuthClientIp,
} from "@/lib/auth/auth-client-ip";
import { getAuthRuntimeConfig } from "@/lib/auth/auth-env";
import { isSelfHostedAuthEnabled } from "@/lib/auth/self-hosted-env";
import {
  readCookie,
  SESSION_DATA_COOKIE_NAME,
  SESSION_TOKEN_COOKIE_NAME,
} from "@/lib/auth/session-cache-cookie";
import {
  applySetCookieHeaders,
  setCookieHeadersFromResponse,
} from "@/lib/request-cost/load-session";

const mintInflight = new Map<string, Promise<string[]>>();

/**
 * When a navigation has a login cookie and the signed session cache is missing
 * or expired, ask Neon Auth to mint a replacement. The new cookie is written
 * onto the response and onto the request the page render reads, because
 * `Set-Cookie` alone is not visible to `auth.getSession()` in that same request.
 * Neon signs the cookie. A valid cache does not call Neon.
 * Parallel requests for the same login cookie share one mint.
 *
 * Self-hosted Better Auth skips this path (no Neon session-data cookie).
 */
export async function refreshSessionCacheHeaders(
  requestHeaders: Headers,
  requestUrl: string,
): Promise<{ headers: Headers; setCookies: string[] }> {
  const headers = new Headers(requestHeaders);
  if (isSelfHostedAuthEnabled()) {
    return { headers, setCookies: [] };
  }
  const cookieHeader = headers.get("cookie") ?? "";
  const token = readCookie(cookieHeader, SESSION_TOKEN_COOKIE_NAME);
  if (!token) {
    return { headers, setCookies: [] };
  }

  const auth = getAuthRuntimeConfig();
  if (!auth) return { headers, setCookies: [] };

  const sessionData = readCookie(cookieHeader, SESSION_DATA_COOKIE_NAME);
  if (sessionData) {
    try {
      const validated = await validateSessionData(sessionData, auth.secret);
      if (validated.valid) return { headers, setCookies: [] };
    } catch {
      // The cache cookie is unreadable. Mint a replacement below.
    }
  }

  try {
    const setCookies = await shareInflight(mintInflight, token, () =>
      mintSessionCache(requestUrl, cookieHeader, headers, auth),
    );
    if (setCookies.length === 0) return { headers, setCookies: [] };
    headers.set("cookie", applySetCookieHeaders(cookieHeader, setCookies));
    return { headers, setCookies };
  } catch {
    return { headers, setCookies: [] };
  }
}

async function mintSessionCache(
  requestUrl: string,
  cookieHeader: string,
  headers: Headers,
  auth: { baseUrl: string; secret: string; sessionDataTtl: number },
): Promise<string[]> {
  const response = await withAuthClientIp(clientIpFromHeaders(headers), () =>
    handleAuthProxyRequest({
      request: new Request(requestUrl, {
        method: "GET",
        headers: { cookie: cookieHeader },
      }),
      path: "get-session",
      baseUrl: auth.baseUrl,
      cookieSecret: auth.secret,
      sessionDataTtl: auth.sessionDataTtl,
      sameSite: "lax",
    }),
  );
  return setCookieHeadersFromResponse(response);
}
