"use server";

import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  GOOGLE_COMPLETE_PROFILE_PATH,
  resolvePostAuthRedirect,
} from "@/lib/auth/return-to";

/**
 * Where to go after Google has stored a session.
 * A profile that already exists returns to the page they left.
 * A new profile still stops to choose a name.
 */
export async function resumeAfterGoogleSignIn(
  nextRaw: string,
): Promise<{ href: string }> {
  const next = resolvePostAuthRedirect(nextRaw);
  const user = await getRequestSessionUser();
  if (!user?.id) return { href: next };

  const profile = await getRequestProfileByAuthUserId(user.id).catch(
    () => null,
  );
  if (profile) return { href: next };

  const params = new URLSearchParams();
  if (next !== "/account") params.set("next", next);
  const qs = params.toString();
  return {
    href: qs
      ? `${GOOGLE_COMPLETE_PROFILE_PATH}?${qs}`
      : GOOGLE_COMPLETE_PROFILE_PATH,
  };
}
