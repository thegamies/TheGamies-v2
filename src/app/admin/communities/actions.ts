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
import {
  getCommunityDirectoryFlags,
  listFeaturedCommunitiesForAdmin,
  updateCommunityDirectoryFlags,
  type CommunityDirectoryFlags,
} from "@/lib/communities/service";
import {
  asCommunityVisibility,
  communityVisibilitySchema,
} from "@/lib/communities/schema";

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
  receptionDemo2025?: boolean;
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
      unmatchedTitles: string[];
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

export async function loadCommunityDirectoryAction(input: {
  communitySlug: string;
}): Promise<
  | { ok: true; flags: CommunityDirectoryFlags }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const flags = await getCommunityDirectoryFlags(input.communitySlug);
  if ("error" in flags) return flags;
  return { ok: true, flags };
}

export async function loadFeaturedCommunitiesAction(): Promise<
  | { ok: true; featured: CommunityDirectoryFlags[] }
  | { error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const featured = await listFeaturedCommunitiesForAdmin();
  return { ok: true, featured };
}

export async function saveCommunityDirectoryAction(input: {
  communitySlug: string;
  featured: boolean;
  joinsClosed: boolean;
  visibility: string;
}): Promise<{ ok: true; flags: CommunityDirectoryFlags } | { error: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const visParsed = communityVisibilitySchema.safeParse(input.visibility);
  if (!visParsed.success) {
    return { error: "Choose public or private." };
  }

  const result = await updateCommunityDirectoryFlags(input.communitySlug, {
    featured: input.featured,
    joinsClosed: input.joinsClosed,
    visibility: visParsed.data,
  });
  if ("error" in result) return result;

  const slug = input.communitySlug.trim().toLowerCase();
  revalidatePath("/admin/communities");
  revalidatePath("/communities");
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/edition`);
  revalidatePath(`/communities/${slug}/settings`);

  const flags = await getCommunityDirectoryFlags(slug);
  if ("error" in flags) return { ok: true, flags: {
    slug,
    name: slug,
    visibility: asCommunityVisibility(visParsed.data),
    featured: input.featured,
    joinsClosed: input.joinsClosed,
  } };
  return { ok: true, flags };
}
