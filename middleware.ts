import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REQUEST_PATHNAME_HEADER } from "@/lib/ads/adsense";
import { getAuthOrNull } from "@/lib/auth/server";

/**
 * Use middleware.ts (not proxy.ts) for OpenNext Cloudflare compatibility.
 * Resolve auth per-request so Worker process.env secrets are available.
 */
export default async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  const nextWithPath = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  const path = request.nextUrl.pathname;
  const onAccount = path === "/account" || path.startsWith("/account/");
  if (!onAccount) {
    return nextWithPath();
  }

  const auth = getAuthOrNull();
  if (!auth) {
    return nextWithPath();
  }
  const handler = auth.middleware({ loginUrl: "/auth/sign-in" });
  return handler(request);
}

export const config = {
  matcher: ["/account", "/account/:path*", "/auth", "/auth/:path*"],
};
