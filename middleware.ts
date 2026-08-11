import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthOrNull } from "@/lib/auth/server";

/**
 * Use middleware.ts (not proxy.ts) for OpenNext Cloudflare compatibility.
 * Next 16 prefers proxy.ts, but current @opennextjs/cloudflare still looks for
 * server/middleware.js — proxy-only builds fail with that missing file.
 */
const auth = getAuthOrNull();

export default auth
  ? auth.middleware({ loginUrl: "/auth/sign-in" })
  : function middleware(_request: NextRequest) {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/account/:path*"],
};
