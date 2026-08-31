import { NextResponse } from "next/server";
import { ACCOUNT_DELETE_FAILED } from "@/lib/auth/account-delete-copy";
import { auth } from "@/lib/auth/server";
import {
  authSessionCookieNamesFromHeader,
  expireAuthCookies,
  originMatchesRequestHost,
} from "@/lib/auth/session-cookies";
import { closeOwnAccount } from "@/lib/profile/close-own-account";

function expireRequestAuthCookies(
  request: Request,
  response: NextResponse,
): void {
  expireAuthCookies(
    authSessionCookieNamesFromHeader(request.headers.get("cookie")),
    (name, value, options) => {
      response.cookies.set(name, value, options);
    },
  );
}

/**
 * JSON POST so the client can leave `/account` with a full navigation.
 * A Server Action would re-render `/account` after Auth close and OpenNext
 * serves the load-error page instead of the action result.
 */
export async function POST(request: Request) {
  if (!originMatchesRequestHost(request)) {
    return NextResponse.json(
      { error: ACCOUNT_DELETE_FAILED },
      { status: 403 },
    );
  }

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to delete your account." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const result = await closeOwnAccount({
    authUserId: userId,
    email: session.user.email,
    password: String(formData.get("password") ?? ""),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  expireRequestAuthCookies(request, response);
  return response;
}
