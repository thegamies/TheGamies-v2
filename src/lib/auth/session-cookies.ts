import {
  LEGACY_NEON_AUTH_COOKIE_NAMES,
  SESSION_TOKEN_COOKIE_NAME,
  BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES,
} from "@/lib/auth/session-cache-cookie";
import { envAppOrigin } from "@/lib/seo/origin-env";

/** Better Auth (and leftover Neon Auth) session cookies to drop after close. */
export function isAuthSessionCookieName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("better-auth") ||
    n.includes("neon-auth") ||
    n.includes("session_token") ||
    n.includes("session-token")
  );
}

export function authSessionCookieNamesFromHeader(
  cookieHeader: string | null,
): string[] {
  if (!cookieHeader) return [];
  const names: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const name = part.trim().split("=")[0];
    if (name && isAuthSessionCookieName(name)) names.push(name);
  }
  return names;
}

/**
 * Auth cookies to drop on sign-out. Includes whatever the browser sent, plus
 * known Better Auth and legacy Neon Auth names so a missing header entry
 * cannot leave a session in place.
 */
export function authCookieNamesToExpire(cookieHeader: string | null): string[] {
  return [
    ...new Set([
      ...authSessionCookieNamesFromHeader(cookieHeader),
      SESSION_TOKEN_COOKIE_NAME,
      ...BETTER_AUTH_SESSION_TOKEN_COOKIE_NAMES,
      ...LEGACY_NEON_AUTH_COOKIE_NAMES,
    ]),
  ];
}

/** Options that overwrite Auth cookies so the browser drops them. */
export function expireAuthCookieOptions(name: string): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: 0;
  expires: Date;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure:
      name.startsWith("__Secure-") ||
      name.startsWith("__Host-") ||
      process.env.NODE_ENV === "production",
  };
}

export function expireAuthCookies(
  names: string[],
  setCookie: (
    name: string,
    value: string,
    options: ReturnType<typeof expireAuthCookieOptions>,
  ) => void,
): void {
  for (const name of names) {
    setCookie(name, "", expireAuthCookieOptions(name));
  }
}

function requestHost(request: Request): string {
  const host = request.headers.get("host")?.trim();
  if (host) return host.toLowerCase();
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}

/**
 * Same-site POST check: `Origin` must be the configured app origin or the
 * request's own host. `X-Forwarded-Host` is client-controlled and ignored.
 */
export function originMatchesRequestHost(
  request: Request,
  appOrigin: string = envAppOrigin(),
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (appOrigin && parsed.origin === appOrigin) return true;
  return parsed.host === requestHost(request);
}
