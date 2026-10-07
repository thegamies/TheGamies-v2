import { envAppOrigin } from "@/lib/seo/origin-env";

/** Neon Auth / Better Auth session cookies we must drop after the user is closed. */
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

/** Options that overwrite Neon Auth cookies so the browser drops them. */
export function expireAuthCookieOptions(name: string): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: 0;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
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

