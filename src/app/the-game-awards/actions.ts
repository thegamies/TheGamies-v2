"use server";

import { revalidatePath } from "next/cache";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { getSiteSheet, saveSiteSheet } from "@/lib/tga-pickem/sheets";

async function requireProfile() {
  const user = await getRequestSessionUser();
  if (!user?.id) return { error: "Sign in to save picks." } as const;
  const profile = await getRequestProfileByAuthUserId(user.id);
  if (!profile) return { error: "Finish your profile to save picks." } as const;
  return { profileId: profile.id };
}

export async function saveSiteTgaSheetAction(
  year: number,
  input: { picks: Record<string, string>; worldPremieresGuess: number },
) {
  const auth = await requireProfile();
  if ("error" in auth) return auth;
  const result = await saveSiteSheet(auth.profileId, year, input);
  if ("error" in result) return result;
  revalidatePath(`/the-game-awards/${year}`);
  revalidatePath("/the-game-awards");
  return { ok: true as const };
}

export async function siteSheetExistsAction(year: number) {
  const auth = await requireProfile();
  if ("error" in auth) return { exists: false };
  const sheet = await getSiteSheet(auth.profileId, year);
  return {
    exists:
      sheet.worldPremieresGuess != null || Object.keys(sheet.picks).length > 0,
  };
}
