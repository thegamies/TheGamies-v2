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
  usernameTaken,
} from "@/lib/profile/service";
import {
  USERNAME_NOT_AVAILABLE,
  parseOwnedUsername,
  visibilitySchema,
} from "@/lib/profile/username";
import { lastHostAccountDeleteMessage } from "@/lib/profile/delete-account";
import {
  listLastHostCommunityNames,
  purgeAndTombstoneProfile,
} from "@/lib/profile/delete-account-service";
import {
  deleteAuthenticatedUser,
  verifyAccountPassword,
} from "@/lib/auth/delete-user";

async function requireSessionUserId(next = "/account"): Promise<string> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/sign-in?next=${next}`);
  }
  return userId;
}

export type AccountFormState = {
  error?: string;
  ok?: boolean;
} | null;

export async function saveAccountProfile(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const userId = await requireSessionUserId();
  const existing = await getProfileByAuthUserId(userId);

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
  if (existing?.username && existing.username !== updated.profile.username) {
    revalidatePath(`/u/${existing.username}`);
  }
  revalidatePath(`/u/${updated.profile.username}`);
  return { ok: true };
}

export async function checkUsernameAvailable(username: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const userId = await requireSessionUserId();
  const parsed = parseOwnedUsername(username);
  if ("error" in parsed) {
    return { available: false, error: parsed.error };
  }
  const taken = await usernameTaken(parsed.username, userId);
  if (taken) {
    return { available: false, error: USERNAME_NOT_AVAILABLE };
  }
  return { available: true };
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

export async function deleteOwnAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  const email = session?.user?.email?.trim();
  if (!userId) {
    redirect("/auth/sign-in?next=/account");
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { error: "Enter your password to delete your account." };
  }
  if (!email) {
    return { error: "Could not verify this account." };
  }

  const profile = await getProfileByAuthUserId(userId);
  if (profile) {
    const lastHostNames = await listLastHostCommunityNames(profile.id);
    const blocked = lastHostAccountDeleteMessage(lastHostNames);
    if (blocked) return { error: blocked };
  }

  const verified = await verifyAccountPassword({ email, password });
  if ("error" in verified) return verified;

  const closed = await deleteAuthenticatedUser({
    password,
    authUserId: userId,
    email,
  });
  if ("error" in closed) return closed;

  // Auth user is gone. Finish tombstone best-effort, then return ok so the
  // client can leave /account. signOut + redirect from this action crashes
  // the Cloudflare Worker after the session is already invalid.
  if (profile) {
    const config = readR2AvatarConfigFromEnv();
    if (config) {
      try {
        await deleteUserAvatarObjects(config, profile.id);
      } catch {
        // Avatar storage may be unconfigured; continue with account deletion.
      }
    }

    try {
      await purgeAndTombstoneProfile(profile.id);
      revalidatePath(`/u/${profile.username}`);
    } catch {
      // Profile tombstone can retry later; the sign-in is already closed.
    }
  }

  try {
    await auth.signOut();
  } catch {
    // Sign-in may already be closed.
  }

  return { ok: true };
}
