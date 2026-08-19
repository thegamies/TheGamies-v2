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

function requestHost(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;
  const host = request.headers.get("host")?.trim();
  if (host) return host;
  try {
    return new URL(request.url).host;
  } catch {
    return "";
  }
}

/** Same-site POST check that still works when the Worker URL differs from the public host. */
export function originMatchesRequestHost(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === requestHost(request);
  } catch {
    return false;
  }
}

