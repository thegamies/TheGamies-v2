import { headers } from "next/headers";
import {
  clientIpFromHeaders,
  shareInflight,
  withAuthClientIp,
} from "@/lib/auth/auth-client-ip";
import {
  hasSessionTokenCookie,
  readCookie,
  SESSION_TOKEN_COOKIE_NAME,
} from "@/lib/auth/session-cache-cookie";

type SessionResult = { data: unknown; error: unknown };

type SessionAuth = {
  getSession: (...args: unknown[]) => Promise<SessionResult>;
};

export type SessionReadContext = {
  /** `null` when the request headers are unavailable. Empty string means no cookies. */
  cookieHeader: string | null;
  clientIp: string | null;
};

/**
 * Keep `auth.getSession()` on the signed session-cache cookie.
 *
 * No session token: there is nothing to resolve, so do not call Neon.
 * Concurrent reads of the same token share one upstream call.
 * Cache misses that do reach Neon carry the visitor IP, so the Auth
 * rate limit is per person.
 */
export function guardSessionReads<T extends object>(
  auth: T,
  read: () => Promise<SessionReadContext> = readSessionContext,
): T {
  const sessionAuth = auth as T & SessionAuth;
  const original = sessionAuth.getSession.bind(sessionAuth);
  const inflight = new Map<string, Promise<SessionResult>>();
  sessionAuth.getSession = (async (...args: unknown[]) => {
    const context = await read();
    if (!disablesCookieCache(args)) {
      if (
        context.cookieHeader !== null &&
        !hasSessionTokenCookie(context.cookieHeader)
      ) {
        return { data: null, error: null };
      }
      const token =
        context.cookieHeader === null
          ? null
          : readCookie(context.cookieHeader, SESSION_TOKEN_COOKIE_NAME);
      return shareInflight(inflight, token, () =>
        withAuthClientIp(context.clientIp, () => original(...args)),
      );
    }
    return withAuthClientIp(context.clientIp, () => original(...args));
  }) as SessionAuth["getSession"];
  return auth;
}

function disablesCookieCache(args: unknown[]): boolean {
  const data = args[0];
  if (!data || typeof data !== "object") return false;
  const query = (data as { query?: { disableCookieCache?: unknown } }).query;
  return query?.disableCookieCache === "true";
}

async function readSessionContext(): Promise<SessionReadContext> {
  try {
    const incoming = await headers();
    return {
      cookieHeader: incoming.get("cookie") ?? "",
      clientIp: clientIpFromHeaders(incoming),
    };
  } catch {
    return { cookieHeader: null, clientIp: null };
  }
}
