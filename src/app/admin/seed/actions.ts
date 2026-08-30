"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { rebuildYear } from "@/lib/live-aggregate/refresh";
import {
  clearStandingsSeeds,
  countStandingsSeeds,
  seedStandingsVoters,
} from "@/lib/live-aggregate/seed-standings";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function seedStandingsAction(input: {
  year: number;
  startIndex: number;
  count: number;
  listSize: number;
  ratingBias: number;
  poolSize: number;
  reseed: boolean;
  rebuild: boolean;
}): Promise<
  | {
      ok: true;
      createdProfiles: number;
      createdLists: number;
      updatedLists: number;
      skipped: number;
      year: number;
      gamePoolSize: number;
      categoryCount: number;
      categoryVotes: number;
      startIndex: number;
      endIndex: number;
      nextIndex: number;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await seedStandingsVoters(input);
  if ("error" in result) return result;

  revalidatePath(`/game-of-the-year/${result.year}`);
  revalidatePath("/admin/seed");
  revalidatePath("/admin/rankings");
  return { ok: true, ...result };
}

export async function rebuildSeedYearAction(input: {
  year: number;
}): Promise<{ ok: true } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const year = Math.floor(input.year);
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return { error: "Pick a valid year." };
  }

  await rebuildYear(year);
  revalidatePath(`/game-of-the-year/${year}`);
  revalidatePath("/admin/seed");
  revalidatePath("/admin/rankings");
  return { ok: true };
}

export async function clearStandingsSeedsAction(input: {
  year?: number;
}): Promise<
  | { ok: true; deletedProfiles: number; deletedLists: number; years: number[] }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await clearStandingsSeeds(input.year);
  for (const year of result.years) {
    revalidatePath(`/game-of-the-year/${year}`);
  }
  revalidatePath("/admin/seed");
  revalidatePath("/admin/rankings");
  return { ok: true, ...result };
}

export async function loadSeedStatsAction(): Promise<
  | { ok: true; profiles: number; lists: number; maxIndex: number }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const stats = await countStandingsSeeds();
  return { ok: true, ...stats };
}
