"use server";

import { revalidatePath } from "next/cache";
import { getRequestProfileByAuthUserId, getRequestSessionUser } from "@/lib/auth/session";
import {
  parseLibraryStatus,
  parseLibraryVisibility,
  type LibraryStatus,
} from "@/lib/activity/kinds";
import { clearLibraryEntry, setLibraryStatus } from "@/lib/library/service";

async function requireProfile() {
  const user = await getRequestSessionUser();
  if (!user?.id) return { error: "Sign in to update your library." as const };
  const profile = await getRequestProfileByAuthUserId(user.id).catch(() => null);
  if (!profile) return { error: "Finish setting up your profile first." as const };
  return { profile };
}

function revalidateLibrary(gameSlug: string, username: string) {
  revalidatePath(`/games/${gameSlug}`);
  revalidatePath(`/u/${username}`);
  revalidatePath("/following");
  revalidatePath("/games");
}

export async function setLibraryStatusAction(input: {
  gameId: string;
  gameSlug: string;
  status: string;
  visibility?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireProfile();
  if ("error" in auth) return auth;
  const status = parseLibraryStatus(input.status);
  if (!status) return { error: "Choose a library status." };
  const visibility = parseLibraryVisibility(input.visibility);
  await setLibraryStatus(auth.profile.id, input.gameId, {
    status: status as LibraryStatus,
    visibility,
  });
  revalidateLibrary(input.gameSlug, auth.profile.username);
  return { ok: true };
}

export async function clearLibraryEntryAction(input: {
  gameId: string;
  gameSlug: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireProfile();
  if ("error" in auth) return auth;
  await clearLibraryEntry(auth.profile.id, input.gameId);
  revalidateLibrary(input.gameSlug, auth.profile.username);
  return { ok: true };
}
