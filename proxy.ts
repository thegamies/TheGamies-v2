import { NextRequest, NextResponse } from "next/server";
import {
  REQUEST_PATHNAME_HEADER,
  REQUEST_SEARCH_HEADER,
} from "@/lib/ads/adsense";
import { getAuthOrNull } from "@/lib/auth/server";

function stampPathHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATHNAME_HEADER, request.nextUrl.pathname);
  requestHeaders.set(REQUEST_SEARCH_HEADER, request.nextUrl.search.slice(1));
  return requestHeaders;
}

/**
 * Next.js 16 runs `proxy.ts` (the `middleware.ts` convention is ignored).
 * Stamp the path for account auth. AdSense is mounted per publication route,
 * not from this file.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = stampPathHeaders(request);
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
  return handler(new NextRequest(request, { headers: requestHeaders }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
