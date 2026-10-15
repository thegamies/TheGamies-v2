import { NextRequest, NextResponse } from "next/server";
import {
  REQUEST_PATHNAME_HEADER,
  REQUEST_SEARCH_HEADER,
} from "@/lib/ads/adsense";
import {
  clientIpFromHeaders,
  withAuthClientIp,
} from "@/lib/auth/auth-client-ip";
import { refreshSessionCacheHeaders } from "@/lib/auth/refresh-session-on-navigation";
import { getAuthOrNull } from "@/lib/auth/server";

function stampPathHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  requestHeaders.set(REQUEST_SEARCH_HEADER, request.nextUrl.search.slice(1));
  return requestHeaders;
}

function withSessionCookies(
  requestHeaders: Headers,
  setCookies: string[],
): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

/**
 * OpenNext Cloudflare 1.20.2 still builds Edge `middleware.ts`, not Node
 * `proxy.ts`. Next 16 deprecates this filename but still runs it. Stamp the
 * path for account auth. AdSense is mounted per publication route, not here.
 *
 * A signed-in navigation with a missing or expired session cache mints a new
 * cache cookie through Neon Auth and forwards it to this render. Public pages
 * stay public. An idle tab does not call Auth.
 */
export async function middleware(request: NextRequest) {
  const requestHeaders = stampPathHeaders(request);
  const path = request.nextUrl.pathname;
  const skipRefresh = path === "/api/auth" || path.startsWith("/api/auth/");
  const refreshed = skipRefresh
    ? { headers: requestHeaders, setCookies: [] as string[] }
    : await refreshSessionCacheHeaders(requestHeaders, request.url);

  const onAccount = path === "/account" || path.startsWith("/account/");
  if (!onAccount) {
    return withSessionCookies(refreshed.headers, refreshed.setCookies);
  }

  const auth = getAuthOrNull();
  if (!auth) {
    return withSessionCookies(refreshed.headers, refreshed.setCookies);
  }
  const handler = auth.middleware({ loginUrl: "/auth/sign-in" });
  const response = await withAuthClientIp(
    clientIpFromHeaders(request.headers),
    () => handler(new NextRequest(request, { headers: refreshed.headers })),
  );
  for (const cookie of refreshed.setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
