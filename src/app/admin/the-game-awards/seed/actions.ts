"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  clearTgaCommunitySheetsForSeedVoters,
  clearTgaSheetsForSeedVoters,
  countTgaCommunitySheetSeeds,
  countTgaSheetSeeds,
  SEED_TGA_MAX_BATCH,
  seedTgaCommunitySheets,
  seedTgaSheets,
} from "@/lib/tga-pickem/seed-sheets";
import { listTgaYears } from "@/lib/tga-pickem/service";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function seedTgaSheetsAction(input: {
  year: number;
  afterProfileId?: string | null;
}): Promise<
  | { ok: true; year: number; wrote: number; lastProfileId: string | null }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await seedTgaSheets({
    year: input.year,
    afterProfileId: input.afterProfileId,
    count: SEED_TGA_MAX_BATCH,
  });
  if ("error" in result) return result;
  revalidatePath(`/the-game-awards/${result.year}`);
  revalidatePath(`/admin/the-game-awards/${result.year}`);
  revalidatePath("/admin/the-game-awards/seed");
  return { ok: true, ...result };
}

export async function loadTgaSeedPageAction(): Promise<
  | {
      ok: true;
      years: number[];
      year: number;
      stats: {
        siteSheets: number;
        seedVoterSheets: number;
        seedVotersWithoutSheet: number;
      } | null;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const years = (await listTgaYears()).map((row) => row.year);
  const year = years[0] ?? new Date().getUTCFullYear();
  const stats = years.length > 0 ? await countTgaSheetSeeds(year) : null;
  return { ok: true, years, year, stats };
}

export async function loadTgaSeedStatsAction(
  year: number,
): Promise<
  | {
      ok: true;
      siteSheets: number;
      seedVoterSheets: number;
      seedVotersWithoutSheet: number;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const stats = await countTgaSheetSeeds(year);
  return { ok: true, ...stats };
}

export async function clearTgaSeedSheetsAction(
  year: number,
): Promise<{ ok: true; deletedSheets: number } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await clearTgaSheetsForSeedVoters(year);
  revalidatePath(`/the-game-awards/${year}`);
  revalidatePath(`/admin/the-game-awards/${year}`);
  revalidatePath("/admin/the-game-awards/seed");
  return { ok: true, ...result };
}

export async function seedTgaCommunitySheetsAction(input: {
  communitySlug: string;
  year: number;
  afterProfileId?: string | null;
}): Promise<
  | { ok: true; year: number; wrote: number; lastProfileId: string | null }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await seedTgaCommunitySheets({
    communitySlug: input.communitySlug,
    year: input.year,
    afterProfileId: input.afterProfileId,
    count: SEED_TGA_MAX_BATCH,
  });
  if ("error" in result) return result;
  const slug = input.communitySlug.trim().toLowerCase();
  revalidatePath(`/communities/${slug}/the-game-awards/${result.year}`);
  revalidatePath("/admin/the-game-awards/seed");
  return { ok: true, ...result };
}

export async function loadTgaCommunitySeedStatsAction(
  communitySlug: string,
  year: number,
): Promise<
  | {
      ok: true;
      slug: string;
      communitySheets: number;
      seedMemberSheets: number;
      seedMembersWithoutSheet: number;
      optedIn: boolean;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const stats = await countTgaCommunitySheetSeeds(communitySlug, year);
  if ("error" in stats) return stats;
  return {
    ok: true,
    slug: stats.slug,
    communitySheets: stats.communitySheets,
    seedMemberSheets: stats.seedMemberSheets,
    seedMembersWithoutSheet: stats.seedMembersWithoutSheet,
    optedIn: stats.optedIn,
  };
}

export async function clearTgaCommunitySeedSheetsAction(
  communitySlug: string,
  year: number,
): Promise<{ ok: true; deletedSheets: number } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await clearTgaCommunitySheetsForSeedVoters(
    communitySlug,
    year,
  );
  if ("error" in result) return result;
  const slug = communitySlug.trim().toLowerCase();
  revalidatePath(`/communities/${slug}/the-game-awards/${year}`);
  revalidatePath("/admin/the-game-awards/seed");
  return { ok: true, ...result };
}
