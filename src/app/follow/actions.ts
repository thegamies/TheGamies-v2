"use server";

import { revalidatePath } from "next/cache";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { allowFollowSeedAccounts } from "@/lib/follow/rules";
import { followProfile, unfollowProfile } from "@/lib/follow/service";
import { getProfileByUsername } from "@/lib/profile/service";

async function requireProfile() {
  const user = await getRequestSessionUser();
  if (!user?.id) return { error: "Sign in to follow people." as const };
  const profile = await getRequestProfileByAuthUserId(user.id).catch(() => null);
  if (!profile) return { error: "Finish setting up your profile first." as const };
  return { profile };
}

function revalidateFollow(viewerUsername: string, targetUsername: string) {
  revalidatePath(`/u/${viewerUsername}`);
  revalidatePath(`/u/${targetUsername}`);
  revalidatePath("/following");
  revalidatePath("/games");
}

export async function followProfileAction(
  username: string,
): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireProfile();
  if ("error" in auth) return auth;
  const target = await getProfileByUsername(username).catch(() => null);
  if (!target) return { error: "Profile not found." };
  const result = await followProfile(
    {
      id: auth.profile.id,
      allowSeedFollow: allowFollowSeedAccounts({
        isSiteAdmin: auth.profile.isSiteAdmin,
      }),
    },
    target,
  );
  if ("error" in result) return result;
  revalidateFollow(auth.profile.username, target.username);
  return { ok: true };
}

export async function unfollowProfileAction(
  username: string,
): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireProfile();
  if ("error" in auth) return auth;
  const target = await getProfileByUsername(username).catch(() => null);
  if (!target) return { error: "Profile not found." };
  await unfollowProfile(auth.profile.id, target.id);
  revalidateFollow(auth.profile.username, target.username);
  return { ok: true };
}
