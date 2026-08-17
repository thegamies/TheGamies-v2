"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  clearCommunitySeeds,
  clearEditionFreezeForAdmin,
  countCommunitySeeds,
  publishEditionForSeed,
  refreshPublishedEditionResultsForSeed,
  seedCommunityEditionBallots,
} from "@/lib/communities/seed-community";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function seedCommunityEditionAction(input: {
  communitySlug: string;
  year: number;
  startIndex: number;
  count: number;
  listSize: number;
  voiceCount: number;
  ratingBias: number;
  poolSize: number;
  reseed: boolean;
  refreshPublishedResults: boolean;
}): Promise<
  | {
      ok: true;
      createdProfiles: number;
      joinedMembers: number;
      alreadyMembers: number;
      createdBallots: number;
      updatedBallots: number;
      voicesSet: number;
      skipped: number;
      year: number;
      editionId: string;
      editionStatus: string;
      gamePoolSize: number;
      startIndex: number;
      endIndex: number;
      nextIndex: number;
      resultsRefreshed: boolean;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await seedCommunityEditionBallots(input);
  if ("error" in result) return result;

  const slug = input.communitySlug.trim().toLowerCase();
  revalidatePath("/admin/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/edition/${result.year}`);
  revalidatePath(`/communities/${slug}/settings`);
  return { ok: true, ...result };
}

export async function publishCommunityEditionSeedAction(input: {
  communitySlug: string;
  year: number;
}): Promise<{ ok: true; editionId: string; path: string } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await publishEditionForSeed(
    input.communitySlug,
    input.year,
  );
  if ("error" in result) return result;

  const slug = input.communitySlug.trim().toLowerCase();
  const year = Math.floor(input.year);
  revalidatePath("/admin/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/edition/${year}`);
  return {
    ok: true,
    editionId: result.editionId,
    path: `/communities/${slug}/edition/${year}`,
  };
}

export async function refreshCommunityEditionResultsAction(input: {
  communitySlug: string;
  year: number;
}): Promise<
  | { ok: true; editionId: string; refreshed: boolean; status: string }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await refreshPublishedEditionResultsForSeed(
    input.communitySlug,
    input.year,
  );
  if ("error" in result) return result;

  const slug = input.communitySlug.trim().toLowerCase();
  const year = Math.floor(input.year);
  revalidatePath("/admin/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/edition/${year}`);
  return result;
}

export async function clearCommunityEditionFreezeAction(input: {
  communitySlug: string;
  year: number;
}): Promise<{ ok: true; editionId: string; path: string } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await clearEditionFreezeForAdmin(
    input.communitySlug,
    input.year,
  );
  if ("error" in result) return result;

  const slug = input.communitySlug.trim().toLowerCase();
  const year = Math.floor(input.year);
  revalidatePath("/admin/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/edition/${year}`);
  return {
    ok: true,
    editionId: result.editionId,
    path: `/communities/${slug}/edition/${year}`,
  };
}

export async function clearCommunitySeedsAction(input: {
  communitySlug?: string;
  deleteProfiles?: boolean;
}): Promise<
  | {
      ok: true;
      removedMembers: number;
      removedBallots: number;
      removedVoices: number;
      deletedProfiles: number;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await clearCommunitySeeds(input);
  if (input.communitySlug) {
    const slug = input.communitySlug.trim().toLowerCase();
    revalidatePath(`/communities/${slug}`);
    revalidatePath(`/communities/${slug}/edition`);
    revalidatePath(`/communities/${slug}/settings`);
  }
  revalidatePath("/admin/communities");
  return { ok: true, ...result };
}

export async function loadCommunitySeedStatsAction(input: {
  communitySlug?: string;
}): Promise<
  | {
      ok: true;
      profiles: number;
      maxIndex: number;
      membersInCommunity: number;
      ballotsInEdition: number;
    }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const stats = await countCommunitySeeds(input.communitySlug);
  return { ok: true, ...stats };
}
