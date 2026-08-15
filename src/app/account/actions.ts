"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  ensureProfileForAuthUser,
  updateOwnedProfile,
} from "@/lib/profile/service";
import { visibilitySchema } from "@/lib/profile/username";

export async function saveAccountProfile(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/sign-in?next=/account");
  }

  const username = String(formData.get("username") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const bio = String(formData.get("bio") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "public");
  const visibilityParsed = visibilitySchema.safeParse(visibilityRaw);
  if (!visibilityParsed.success) {
    return { error: "Choose a valid visibility." };
  }

  const ensured = await ensureProfileForAuthUser({
    authUserId: userId,
    username,
    displayName,
  });
  if ("error" in ensured) {
    return { error: ensured.error };
  }

  const updated = await updateOwnedProfile({
    authUserId: userId,
    username,
    displayName,
    bio,
    visibility: visibilityParsed.data,
  });

  if ("error" in updated) {
    return { error: updated.error };
  }

  revalidatePath("/account");
  revalidatePath(`/u/${updated.profile.username}`);
  return null;
}
