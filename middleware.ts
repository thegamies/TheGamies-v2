import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthOrNull } from "@/lib/auth/server";

/**
 * Use middleware.ts (not proxy.ts) for OpenNext Cloudflare compatibility.
 * Resolve auth per-request so Worker process.env secrets are available.
 */
export default async function middleware(request: NextRequest) {
  const auth = getAuthOrNull();
  if (!auth) {
    return NextResponse.next();
  }
  const handler = auth.middleware({ loginUrl: "/auth/sign-in" });
  return handler(request);
}

export const config = {
  matcher: ["/account", "/account/:path*"],
};
