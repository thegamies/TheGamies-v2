import {
  deleteAuthenticatedUser,
  verifyAccountPassword,
} from "@/lib/auth/delete-user";
import {
  deleteUserAvatarObjects,
  deleteUserBannerObjects,
  readR2AvatarConfigFromEnv,
} from "@/lib/profile/avatar-upload";
import { lastHostAccountDeleteMessage } from "@/lib/profile/delete-account";
import {
  listLastHostCommunityNames,
  purgeAndTombstoneProfile,
} from "@/lib/profile/delete-account-service";
import { getProfileByAuthUserId } from "@/lib/profile/service";

export type CloseOwnAccountResult = { ok: true } | { error: string };

/**
 * Close the Neon Auth user and tombstone the profile.
 * Does not redirect or sign out — callers must leave `/account` without an
 * RSC refresh (OpenNext crashes if Next re-renders that page after Auth close).
 */
export async function closeOwnAccount(input: {
  authUserId: string;
  email?: string | null;
  password: string;
}): Promise<CloseOwnAccountResult> {
  const password = input.password;
  if (!password) {
    return { error: "Enter your password to delete your account." };
  }
  const email = input.email?.trim();
  if (!email) {
    return { error: "Could not verify this account." };
  }

  const profile = await getProfileByAuthUserId(input.authUserId);
  if (profile) {
    const lastHostNames = await listLastHostCommunityNames(profile.id);
    const blocked = lastHostAccountDeleteMessage(lastHostNames);
    if (blocked) return { error: blocked };
  }

  const verified = await verifyAccountPassword({ email, password });
  if ("error" in verified) return verified;

  const closed = await deleteAuthenticatedUser({
    password,
    authUserId: input.authUserId,
    email,
  });
  if ("error" in closed) return closed;

  if (profile) {
    const config = readR2AvatarConfigFromEnv();
    if (config) {
      try {
        await deleteUserAvatarObjects(config, profile.id);
        await deleteUserBannerObjects(config, profile.id);
      } catch {
        // Avatar storage may be unconfigured; continue with account deletion.
      }
    }

    try {
      await purgeAndTombstoneProfile(profile.id);
    } catch {
      // Profile tombstone can retry later; the sign-in is already closed.
    }
  }

  return { ok: true };
}
