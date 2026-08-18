"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  deleteUserAvatarObjects,
  readR2AvatarConfigFromEnv,
  uploadAvatarObject,
  AVATAR_MAX_BYTES,
} from "@/lib/profile/avatar-upload";
import { SOCIAL_LINK_KEYS } from "@/lib/profile/social-links";
import {
  ensureProfileForAuthUser,
  getProfileByAuthUserId,
  updateOwnedAvatarUrl,
  updateOwnedProfile,
} from "@/lib/profile/service";
import { visibilitySchema } from "@/lib/profile/username";

async function requireSessionUserId(next = "/account"): Promise<string> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/sign-in?next=${next}`);
  }
  return userId;
}

export async function saveAccountProfile(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const userId = await requireSessionUserId();

  const username = String(formData.get("username") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const bio = String(formData.get("bio") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "public");
  const visibilityParsed = visibilitySchema.safeParse(visibilityRaw);
  if (!visibilityParsed.success) {
    return { error: "Choose a valid visibility." };
  }

  const socialLinks = Object.fromEntries(
    SOCIAL_LINK_KEYS.map((key) => [key, String(formData.get(`social_${key}`) ?? "")]),
  );

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
    socialLinks,
  });

  if ("error" in updated) {
    return { error: updated.error };
  }

  revalidatePath("/account");
  revalidatePath(`/u/${updated.profile.username}`);
  return null;
}

export async function uploadAccountAvatar(
  formData: FormData,
): Promise<{ error?: string; avatarUrl?: string }> {
  const userId = await requireSessionUserId();
  const profile = await getProfileByAuthUserId(userId);
  if (!profile) {
    return { error: "Profile not found." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Photo must be 2MB or smaller." };
  }

  const config = readR2AvatarConfigFromEnv();
  if (!config) {
    return { error: "Photo upload is not available right now." };
  }

  try {
    const body = await file.arrayBuffer();
    const { avatarUrl } = await uploadAvatarObject(config, {
      profileId: profile.id,
      contentType: file.type || "image/jpeg",
      body,
    });
    const updated = await updateOwnedAvatarUrl({
      authUserId: userId,
      avatarUrl,
    });
    if ("error" in updated) return { error: updated.error };
    revalidatePath("/account");
    revalidatePath(`/u/${updated.profile.username}`);
    return { avatarUrl: updated.profile.avatarUrl ?? avatarUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Photo could not be saved.",
    };
  }
}

export async function removeAccountAvatar(): Promise<{
  error?: string;
  ok?: boolean;
}> {
  const userId = await requireSessionUserId();
  const profile = await getProfileByAuthUserId(userId);
  if (!profile) {
    return { error: "Profile not found." };
  }

  const config = readR2AvatarConfigFromEnv();
  if (config) {
    await deleteUserAvatarObjects(config, profile.id);
  }

  const updated = await updateOwnedAvatarUrl({
    authUserId: userId,
    avatarUrl: null,
  });
  if ("error" in updated) return { error: updated.error };
  revalidatePath("/account");
  revalidatePath(`/u/${updated.profile.username}`);
  return { ok: true };
}
