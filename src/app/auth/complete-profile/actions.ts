"use server";

import { redirect } from "next/navigation";
import { identityFromAuthUser } from "@/lib/auth/oauth-identity";
import { auth } from "@/lib/auth/server";
import { buildSignInHref, resolvePostAuthRedirect } from "@/lib/auth/return-to";
import { ensureProfileForAuthUser } from "@/lib/profile/service";

export type CompleteProfileState = { error: string } | null;

export async function completeGoogleProfile(
  _prevState: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const next = resolvePostAuthRedirect(
    formData.get("next"),
    formData.get("intent"),
  );

  let userId: string | undefined;
  let avatarUrl: string | null = null;
  try {
    const { data: session } = await auth.getSession();
    userId = session?.user?.id;
    avatarUrl = identityFromAuthUser(session?.user).imageUrl;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    redirect(buildSignInHref({ next }));
  }

  if (!displayName || !username) {
    return { error: "Fill in all fields." };
  }

  const ensured = await ensureProfileForAuthUser({
    authUserId: userId,
    username,
    displayName,
    avatarUrl,
  });

  if ("error" in ensured) {
    return { error: ensured.error };
  }

  redirect(next);
}
