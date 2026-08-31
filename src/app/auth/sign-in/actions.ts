"use server";

import { cookies, headers } from "next/headers";
import { markNeonAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import { skipEmailVerification } from "@/lib/auth/skip-email-verification";
import {
  authSessionCookieNamesFromHeader,
  expireAuthCookies,
} from "@/lib/auth/session-cookies";

/** Drop leftover Auth cookies so a new sign-in can store a session. */
export async function clearStaleAuthCookies(): Promise<void> {
  const cookieHeader = (await headers()).get("cookie");
  const jar = await cookies();
  expireAuthCookies(
    authSessionCookieNamesFromHeader(cookieHeader),
    (name, value, options) => {
      jar.set(name, value, options);
    },
  );
}

/** Local `next dev` only — hosted deploys still require confirm-email. */
export async function markVerifiedForLocalDev(email: string): Promise<boolean> {
  if (!skipEmailVerification()) return false;
  return markNeonAuthEmailVerified({ email }).catch(() => false);
}
