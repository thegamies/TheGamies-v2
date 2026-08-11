import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthOrNull } from "@/lib/auth/server";

const auth = getAuthOrNull();

export default auth
  ? auth.middleware({ loginUrl: "/auth/sign-in" })
  : function passthrough(_request: NextRequest) {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/account/:path*"],
};
