import { and, eq, inArray, like, sql } from "drizzle-orm";
import {
  communityEditionBallotCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionVoices,
  communityEditions,
  communityMembers,
  communities,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  loadSeedGamePool,
  buildSeedCategoryVotes,
  weightForRatedGame,
  weightedSample,
} from "@/lib/live-aggregate/seed-standings";
import {
  ensureAwardCategories,
  listActiveAwardCategories,
} from "@/lib/live-aggregate/categories";
import { rebuildEditionResultsFrozen } from "./edition-results";
import { computeEditionStatus } from "./edition-status";

export const SEED_COMMUNITY_AUTH_PREFIX = "seed:community:";
export const SEED_COMMUNITY_USERNAME_PREFIX = "seedcmem";
export const SEED_COMMUNITY_MAX_INDEX = 1000;
export const SEED_COMMUNITY_MAX_BATCH = 100;

function getDb(): Db {
  return createDb();
}

export function seedCommunityAuthUserId(index: number): string {
  return `${SEED_COMMUNITY_AUTH_PREFIX}${String(index).padStart(4, "0")}`;
}

export function seedCommunityUsername(index: number): string {
  return `${SEED_COMMUNITY_USERNAME_PREFIX}${String(index).padStart(3, "0")}`;
}

export async function getMaxCommunitySeedIndex(
  db: Db = getDb(),
): Promise<number> {
  const rows = await db
    .select({ authUserId: profiles.authUserId })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`));

  let max = 0;
  for (const row of rows) {
    const suffix = row.authUserId.slice(SEED_COMMUNITY_AUTH_PREFIX.length);
    const n = Number(suffix);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export async function countCommunitySeeds(
  communitySlug?: string,
  db: Db = getDb(),
): Promise<{
  profiles: number;
  maxIndex: number;
  membersInCommunity: number;
  ballotsInEdition: number;
}> {
  const maxIndex = await getMaxCommunitySeedIndex(db);
  const [profileCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`));

  let membersInCommunity = 0;
  let ballotsInEdition = 0;

  if (communitySlug) {
    const [community] = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.slug, communitySlug.trim().toLowerCase()))
      .limit(1);
    if (community) {
      const seedProfiles = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`));
      const seedIds = seedProfiles.map((p) => p.id);
      if (seedIds.length > 0) {
        const [memberCount] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.communityId, community.id),
              inArray(communityMembers.profileId, seedIds),
            ),
          );
        membersInCommunity = Number(memberCount?.n ?? 0);

        const editionRows = await db
          .select({ id: communityEditions.id })
          .from(communityEditions)
          .where(eq(communityEditions.communityId, community.id));
        const editionIds = editionRows.map((e) => e.id);
        if (editionIds.length > 0) {
          const [ballotCount] = await db
            .select({ n: sql<number>`count(*)::int` })
            .from(communityEditionBallots)
            .where(
              and(
                inArray(communityEditionBallots.editionId, editionIds),
                inArray(communityEditionBallots.profileId, seedIds),
              ),
            );
          ballotsInEdition = Number(ballotCount?.n ?? 0);
        }
      }
    }
  }

  return {
    profiles: Number(profileCount?.n ?? 0),
    maxIndex,
    membersInCommunity,
    ballotsInEdition,
  };
}

export type SeedCommunityEditionInput = {
  communitySlug: string;
  year: number;
  startIndex?: number;
  count: number;
  listSize?: number;
  /** How many of this batch to mark as Voices (from start of batch). */
  voiceCount?: number;
  ratingBias?: number;
  poolSize?: number;
  /** Replace existing seed ballots for these profiles. */
  reseed?: boolean;
  /**
   * When true and edition is published, clear old freeze and re-freeze
   * so results reflect new ballots (ops only).
   */
  refreshPublishedResults?: boolean;
};

export type SeedCommunityEditionResult = {
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
};

/**
 * Ensure an edition row exists and is publicly visible for QA.
 * Draft / incomplete schedules get an open voting window.
 */
async function ensureEditionForSeed(
  communityId: string,
  year: number,
  db: Db,
): Promise<{ id: string; status: string }> {
  const now = new Date();
  const opensAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const closesAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const publishesAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  const [existing] = await db
    .select()
    .from(communityEditions)
    .where(
      and(
        eq(communityEditions.communityId, communityId),
        eq(communityEditions.year, year),
      ),
    )
    .limit(1);

  if (existing) {
    const status = computeEditionStatus(existing, now);
    if (status === "draft") {
      const [updated] = await db
        .update(communityEditions)
        .set({
          opensAt: existing.opensAt ?? opensAt,
          closesAt: existing.closesAt ?? closesAt,
          publishesAt: existing.publishesAt ?? publishesAt,
          updatedAt: now,
        })
        .where(eq(communityEditions.id, existing.id))
        .returning();
      if (updated) {
        return {
          id: updated.id,
          status: computeEditionStatus(updated, now),
        };
      }
    }
    return {
      id: existing.id,
      status,
    };
  }

  const [created] = await db
    .insert(communityEditions)
    .values({
      communityId,
      year,
      opensAt,
      closesAt,
      publishesAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new Error("Could not create edition for seed.");
  }

  return {
    id: created.id,
    status: computeEditionStatus(created, now),
  };
}

/** Ops helper: close voting and publish so frozen results are visible. */
export async function publishEditionForSeed(
  communitySlug: string,
  year: number,
  db: Db = getDb(),
): Promise<{ ok: true; editionId: string } | { error: string }> {
  const slug = communitySlug.trim().toLowerCase();
  const y = Math.floor(year);
  if (!slug) return { error: "Enter a community slug." };
  if (!Number.isFinite(y) || y < 1970 || y > 2100) {
    return { error: "Pick a valid year." };
  }

  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);
  if (!community) return { error: "Community not found." };

  const edition = await ensureEditionForSeed(community.id, y, db);
  const now = new Date();
  const [updated] = await db
    .update(communityEditions)
    .set({
      opensAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      closesAt: new Date(now.getTime() - 60 * 1000),
      publishesAt: now,
      updatedAt: now,
    })
    .where(eq(communityEditions.id, edition.id))
    .returning();

  if (!updated) return { error: "Could not publish edition." };

  const frozen = await rebuildEditionResultsFrozen(edition.id, db);
  if (frozen && "error" in frozen) return frozen;
  return { ok: true, editionId: edition.id };
}

export async function seedCommunityEditionBallots(
  input: SeedCommunityEditionInput,
  db: Db = getDb(),
): Promise<SeedCommunityEditionResult | { error: string }> {
  const slug = input.communitySlug.trim().toLowerCase();
  const year = Math.floor(input.year);
  const startIndex = Math.max(1, Math.floor(input.startIndex ?? 1));
  const count = Math.floor(input.count);
  const listSize = Math.min(100, Math.max(1, Math.floor(input.listSize ?? 10)));
  const voiceCount = Math.max(0, Math.floor(input.voiceCount ?? 0));
  const ratingBias = Math.max(
    -100,
    Math.min(100, Math.floor(input.ratingBias ?? 40)),
  );
  const poolSize = Math.min(
    2000,
    Math.max(50, Math.floor(input.poolSize ?? 500)),
  );
  const reseed = input.reseed !== false;
  const refreshPublished = input.refreshPublishedResults === true;

  if (!slug) return { error: "Enter a community slug." };
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return { error: "Pick a valid year." };
  }
  if (!Number.isFinite(count) || count < 1 || count > SEED_COMMUNITY_MAX_BATCH) {
    return {
      error: `Each batch can create between 1 and ${SEED_COMMUNITY_MAX_BATCH} members.`,
    };
  }
  if (startIndex > SEED_COMMUNITY_MAX_INDEX) {
    return { error: `Seed index cannot exceed ${SEED_COMMUNITY_MAX_INDEX}.` };
  }

  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);
  if (!community) return { error: "Community not found." };

  const edition = await ensureEditionForSeed(community.id, year, db);

  const endIndex = Math.min(
    SEED_COMMUNITY_MAX_INDEX,
    startIndex + count - 1,
  );
  const indices = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, i) => startIndex + i,
  );

  const pool = await loadSeedGamePool(year, poolSize, db);
  if (pool.length < Math.min(listSize, pool.length) || pool.length === 0) {
    return {
      error: `Need released ${year} games in the catalog to seed ballots.`,
    };
  }
  const effectiveListSize = Math.min(listSize, pool.length);

  await ensureAwardCategories(db);
  const categories = await listActiveAwardCategories(db);
  if (categories.length === 0) {
    return {
      error:
        "No active award categories found after syncing the catalog. Check award category migrations.",
    };
  }

  const wantedAuthIds = indices.map(seedCommunityAuthUserId);
  const existingProfiles = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.authUserId, wantedAuthIds));
  const byAuth = new Map(existingProfiles.map((p) => [p.authUserId, p]));

  let createdProfiles = 0;
  let joinedMembers = 0;
  let alreadyMembers = 0;
  let createdBallots = 0;
  let updatedBallots = 0;
  let voicesSet = 0;
  let skipped = 0;

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]!;
    const authUserId = seedCommunityAuthUserId(index);
    const username = seedCommunityUsername(index);
    let profile = byAuth.get(authUserId);

    if (!profile) {
      const [created] = await db
        .insert(profiles)
        .values({
          authUserId,
          username,
          displayName: `Seed Member ${String(index).padStart(3, "0")}`,
          bio: "Synthetic community member for edition QA.",
          visibility: "public",
        })
        .returning();
      if (!created) {
        skipped += 1;
        continue;
      }
      profile = created;
      byAuth.set(authUserId, created);
      createdProfiles += 1;
    }

    const [member] = await db
      .select({ profileId: communityMembers.profileId })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.profileId, profile.id),
        ),
      )
      .limit(1);

    if (!member) {
      await db.insert(communityMembers).values({
        communityId: community.id,
        profileId: profile.id,
        role: "member",
      });
      joinedMembers += 1;
    } else {
      alreadyMembers += 1;
    }

    const makeVoice = i < voiceCount;
    if (makeVoice) {
      await db
        .insert(communityEditionVoices)
        .values({
          editionId: edition.id,
          profileId: profile.id,
          designatedAt: new Date(),
          designatedByProfileId: null,
        })
        .onConflictDoNothing();
      voicesSet += 1;
    }

    const [existingBallot] = await db
      .select()
      .from(communityEditionBallots)
      .where(
        and(
          eq(communityEditionBallots.editionId, edition.id),
          eq(communityEditionBallots.profileId, profile.id),
        ),
      )
      .limit(1);

    if (existingBallot && !reseed) {
      skipped += 1;
      continue;
    }

    const picked = weightedSample(pool, effectiveListSize, (g) =>
      weightForRatedGame(g, ratingBias),
    );

    let ballotId: string;
    const now = new Date();
    if (existingBallot) {
      ballotId = existingBallot.id;
      await db
        .delete(communityEditionBallotItems)
        .where(eq(communityEditionBallotItems.ballotId, ballotId));
      await db
        .delete(communityEditionBallotCategoryVotes)
        .where(eq(communityEditionBallotCategoryVotes.ballotId, ballotId));
      await db
        .update(communityEditionBallots)
        .set({ updatedAt: now })
        .where(eq(communityEditionBallots.id, ballotId));
      updatedBallots += 1;
    } else {
      const [createdBallot] = await db
        .insert(communityEditionBallots)
        .values({
          editionId: edition.id,
          profileId: profile.id,
          submittedAt: now,
          updatedAt: now,
        })
        .returning();
      if (!createdBallot) {
        skipped += 1;
        continue;
      }
      ballotId = createdBallot.id;
      createdBallots += 1;
    }

    if (picked.length > 0) {
      await db.insert(communityEditionBallotItems).values(
        picked.map((game, rankIndex) => ({
          ballotId,
          gameId: game.id,
          rank: rankIndex + 1,
          blurb: null,
        })),
      );
    }

    if (categories.length > 0 && picked.length > 0) {
      const catVotes = buildSeedCategoryVotes(categories, picked);
      if (catVotes.length > 0) {
        await db.insert(communityEditionBallotCategoryVotes).values(
          catVotes.map((vote) => ({
            ballotId,
            categoryId: vote.categoryId,
            gameId: vote.gameId,
          })),
        );
      }
    }
  }

  let resultsRefreshed = false;
  if (refreshPublished && edition.status === "published") {
    const frozen = await rebuildEditionResultsFrozen(edition.id, db);
    if (frozen && "error" in frozen) {
      return {
        error: `Ballots were written, but rebuilding published results failed (${frozen.error}). Use Publish / rebuild results.`,
      };
    }
    resultsRefreshed = true;
  }

  return {
    createdProfiles,
    joinedMembers,
    alreadyMembers,
    createdBallots,
    updatedBallots,
    voicesSet,
    skipped,
    year,
    editionId: edition.id,
    editionStatus: edition.status,
    gamePoolSize: pool.length,
    startIndex,
    endIndex,
    nextIndex: endIndex + 1,
    resultsRefreshed,
  };
}

export async function clearCommunitySeeds(
  input: { communitySlug?: string; deleteProfiles?: boolean } = {},
  db: Db = getDb(),
): Promise<{
  removedMembers: number;
  removedBallots: number;
  removedVoices: number;
  deletedProfiles: number;
}> {
  const seedProfiles = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`));
  const seedIds = seedProfiles.map((p) => p.id);
  if (seedIds.length === 0) {
    return {
      removedMembers: 0,
      removedBallots: 0,
      removedVoices: 0,
      deletedProfiles: 0,
    };
  }

  let communityId: string | null = null;
  if (input.communitySlug) {
    const [community] = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.slug, input.communitySlug.trim().toLowerCase()))
      .limit(1);
    communityId = community?.id ?? null;
    if (!communityId) {
      return {
        removedMembers: 0,
        removedBallots: 0,
        removedVoices: 0,
        deletedProfiles: 0,
      };
    }
  }

  let removedBallots = 0;
  let removedVoices = 0;
  let removedMembers = 0;

  const editions = communityId
    ? await db
        .select({ id: communityEditions.id })
        .from(communityEditions)
        .where(eq(communityEditions.communityId, communityId))
    : await db.select({ id: communityEditions.id }).from(communityEditions);

  const editionIds = editions.map((e) => e.id);

  if (editionIds.length > 0) {
    const ballots = await db
      .select({ id: communityEditionBallots.id })
      .from(communityEditionBallots)
      .where(
        and(
          inArray(communityEditionBallots.editionId, editionIds),
          inArray(communityEditionBallots.profileId, seedIds),
        ),
      );
    if (ballots.length > 0) {
      await db
        .delete(communityEditionBallots)
        .where(
          inArray(
            communityEditionBallots.id,
            ballots.map((b) => b.id),
          ),
        );
      removedBallots = ballots.length;
    }

    const voiceRows = await db
      .delete(communityEditionVoices)
      .where(
        and(
          inArray(communityEditionVoices.editionId, editionIds),
          inArray(communityEditionVoices.profileId, seedIds),
        ),
      )
      .returning({ profileId: communityEditionVoices.profileId });
    removedVoices = voiceRows.length;
  }

  if (communityId) {
    const memberRows = await db
      .delete(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          inArray(communityMembers.profileId, seedIds),
        ),
      )
      .returning({ profileId: communityMembers.profileId });
    removedMembers = memberRows.length;
  } else {
    const memberRows = await db
      .delete(communityMembers)
      .where(inArray(communityMembers.profileId, seedIds))
      .returning({ profileId: communityMembers.profileId });
    removedMembers = memberRows.length;
  }

  let deletedProfiles = 0;
  if (input.deleteProfiles) {
    const deleted = await db
      .delete(profiles)
      .where(inArray(profiles.id, seedIds))
      .returning({ id: profiles.id });
    deletedProfiles = deleted.length;
  }

  return {
    removedMembers,
    removedBallots,
    removedVoices,
    deletedProfiles,
  };
}
