import { NextResponse } from "next/server";
import {
  clientIpFromHeaders,
  withAuthClientIp,
} from "@/lib/auth/auth-client-ip";
import { getAuthOrNull } from "@/lib/auth/server";
import {
  resetPasswordFormPath,
  tokenFromResetPasswordSegments,
} from "@/lib/auth/reset-password-token";

async function notConfigured() {
  return NextResponse.json(
    { error: "Auth is not configured" },
    { status: 503 },
  );
}

/**
 * Better Auth may email `/api/auth/reset-password/:token`. A GET through the
 * Auth handler spends the token before the form can POST. Send the unused
 * token to the in-app reset page instead.
 */
function unusedResetPasswordRedirect(request: Request, path: string[]) {
  if (path[0] !== "reset-password") return null;
  const token =
    tokenFromResetPasswordSegments(path) ??
    new URL(request.url).searchParams.get("token")?.trim() ??
    null;
  if (!token) return null;
  return NextResponse.redirect(
    new URL(resetPasswordFormPath(token), request.url),
    303,
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path ?? [];
  const resetRedirect = unusedResetPasswordRedirect(request, path);
  if (resetRedirect) return resetRedirect;
  const auth = getAuthOrNull();
  if (!auth) return notConfigured();
  return withAuthClientIp(clientIpFromHeaders(request.headers), () =>
    auth.handler().GET(request),
  );
}

export async function POST(request: Request) {
  const auth = getAuthOrNull();
  if (!auth) return notConfigured();
  return withAuthClientIp(clientIpFromHeaders(request.headers), () =>
    auth.handler().POST(request),
  );
}
