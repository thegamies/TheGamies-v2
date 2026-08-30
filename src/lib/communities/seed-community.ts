import { and, eq, inArray, like, sql } from "drizzle-orm";
import {
  communityEditionBallotCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionVoices,
  communityEditions,
  communityHosts,
  communityMembers,
  communities,
  createDb,
  profiles,
  tgaCommunityHosts,
  type Db,
} from "@thegamies/db";
import { insertInChunks } from "@/lib/db/insert-chunks";
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
import {
  clearEditionResultsFrozen,
  rebuildEditionResultsFrozen,
} from "./edition-results";
import { seedEditionCategories } from "./edition-categories";
import { computeEditionStatus } from "./edition-status";

export const SEED_COMMUNITY_AUTH_PREFIX = "seed:community:";
export const SEED_COMMUNITY_USERNAME_PREFIX = "seedcmem";
/** Per-request batch size (no total index cap — client loops to grow). */
export const SEED_COMMUNITY_MAX_BATCH = 50;
export const SEED_COMMUNITY_INSERT_CHUNK = 200;

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
  const [row] = await db
    .select({
      maxIndex: sql<number>`coalesce(max(nullif(replace(${profiles.authUserId}, ${SEED_COMMUNITY_AUTH_PREFIX}, ''), '')::int), 0)`,
    })
    .from(profiles)
    .where(like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`));
  return Number(row?.maxIndex ?? 0);
}

export function resolveCommunitySeedStartIndex(opts: {
  reseed: boolean;
  maxIndex: number;
}): number {
  if (opts.reseed) return 1;
  return Math.max(1, Math.floor(opts.maxIndex) + 1);
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
      const seedAuth = like(
        profiles.authUserId,
        `${SEED_COMMUNITY_AUTH_PREFIX}%`,
      );
      const [memberCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityMembers)
        .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
        .where(and(eq(communityMembers.communityId, community.id), seedAuth));
      membersInCommunity = Number(memberCount?.n ?? 0);

      const [ballotCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(communityEditionBallots)
        .innerJoin(
          communityEditions,
          eq(communityEditions.id, communityEditionBallots.editionId),
        )
        .innerJoin(profiles, eq(profiles.id, communityEditionBallots.profileId))
        .where(and(eq(communityEditions.communityId, community.id), seedAuth));
      ballotsInEdition = Number(ballotCount?.n ?? 0);
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
  const { markEditionFreezeReady } = await import("./edition-freeze");
  await markEditionFreezeReady(edition.id, db);
  return { ok: true, editionId: edition.id };
}

/** Rebuild freeze if the edition is already published — does not close voting. */
export async function refreshPublishedEditionResultsForSeed(
  communitySlug: string,
  year: number,
  db: Db = getDb(),
): Promise<
  | { ok: true; editionId: string; refreshed: boolean; status: string }
  | { error: string }
> {
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

  const [edition] = await db
    .select()
    .from(communityEditions)
    .where(
      and(
        eq(communityEditions.communityId, community.id),
        eq(communityEditions.year, y),
      ),
    )
    .limit(1);
  if (!edition) return { error: "Edition not found." };

  const status = computeEditionStatus(edition, new Date());
  if (status !== "published") {
    return { ok: true, editionId: edition.id, refreshed: false, status };
  }

  const frozen = await rebuildEditionResultsFrozen(edition.id, db);
  if (frozen && "error" in frozen) return frozen;
  const { markEditionFreezeReady } = await import("./edition-freeze");
  await markEditionFreezeReady(edition.id, db);
  return { ok: true, editionId: edition.id, refreshed: true, status };
}

/** Admin: delete frozen result rows for a community year (ballots kept). */
export async function clearEditionFreezeForAdmin(
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

  const [edition] = await db
    .select()
    .from(communityEditions)
    .where(
      and(
        eq(communityEditions.communityId, community.id),
        eq(communityEditions.year, y),
      ),
    )
    .limit(1);
  if (!edition) return { error: "Edition not found." };

  await clearEditionResultsFrozen(edition.id, db);
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
  if (!Number.isFinite(startIndex) || startIndex < 1) {
    return { error: "Start index must be at least 1." };
  }

  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);
  if (!community) return { error: "Community not found." };

  const edition = await ensureEditionForSeed(community.id, year, db);

  const endIndex = startIndex + count - 1;
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
  await seedEditionCategories(edition.id, db);

  const wantedAuthIds = indices.map(seedCommunityAuthUserId);
  const wantedUsernames = indices.map(seedCommunityUsername);
  const existingProfiles = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.authUserId, wantedAuthIds));
  const byAuth = new Map(existingProfiles.map((p) => [p.authUserId, p]));

  const missing = indices
    .map((index, i) => ({
      index,
      authUserId: wantedAuthIds[i]!,
      username: wantedUsernames[i]!,
      displayName: `Seed Member ${String(index).padStart(3, "0")}`,
    }))
    .filter((row) => !byAuth.has(row.authUserId));

  if (missing.length > 0) {
    const usernameClash = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(inArray(profiles.username, missing.map((m) => m.username)));
    if (usernameClash.length > 0) {
      return {
        error: `Username ${usernameClash[0]!.username} is already taken by a non-seed account.`,
      };
    }

    const inserted = await db
      .insert(profiles)
      .values(
        missing.map((m) => ({
          authUserId: m.authUserId,
          username: m.username,
          displayName: m.displayName,
          bio: "Synthetic community member for edition QA.",
          visibility: "public" as const,
        })),
      )
      .returning();
    for (const profile of inserted) {
      byAuth.set(profile.authUserId, profile);
    }
  }

  const profilesInOrder = wantedAuthIds.map((id) => byAuth.get(id));
  if (profilesInOrder.some((p) => !p)) {
    return { error: "Could not create seed profiles." };
  }
  const readyProfiles = profilesInOrder as NonNullable<
    (typeof profilesInOrder)[number]
  >[];
  const profileIds = readyProfiles.map((p) => p.id);
  const createdProfiles = missing.length;

  const existingMembers = await db
    .select({ profileId: communityMembers.profileId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        inArray(communityMembers.profileId, profileIds),
      ),
    );
  const memberSet = new Set(existingMembers.map((m) => m.profileId));
  const membersToJoin = readyProfiles.filter((p) => !memberSet.has(p.id));
  if (membersToJoin.length > 0) {
    await db
      .insert(communityMembers)
      .values(
        membersToJoin.map((p) => ({
          communityId: community.id,
          profileId: p.id,
          role: "member" as const,
        })),
      )
      .onConflictDoNothing();
  }
  const joinedMembers = membersToJoin.length;
  const alreadyMembers = readyProfiles.length - joinedMembers;

  const voiceProfiles = readyProfiles.slice(0, voiceCount);
  let voicesSet = 0;
  if (voiceProfiles.length > 0) {
    const designatedAt = new Date();
    await db
      .insert(communityEditionVoices)
      .values(
        voiceProfiles.map((p) => ({
          editionId: edition.id,
          profileId: p.id,
          designatedAt,
          designatedByProfileId: null,
        })),
      )
      .onConflictDoNothing();
    await db
      .insert(communityHosts)
      .values(
        voiceProfiles.map((p) => ({
          communityId: community.id,
          profileId: p.id,
          promotedAt: designatedAt,
          promotedByProfileId: null,
          retiredAt: null,
          retiredByProfileId: null,
        })),
      )
      .onConflictDoUpdate({
        target: [communityHosts.communityId, communityHosts.profileId],
        set: {
          retiredAt: null,
          retiredByProfileId: null,
        },
      });
    voicesSet = voiceProfiles.length;
  }

  const existingBallots = await db
    .select({
      id: communityEditionBallots.id,
      profileId: communityEditionBallots.profileId,
    })
    .from(communityEditionBallots)
    .where(
      and(
        eq(communityEditionBallots.editionId, edition.id),
        inArray(communityEditionBallots.profileId, profileIds),
      ),
    );
  const ballotByProfile = new Map(
    existingBallots.map((b) => [b.profileId, b.id]),
  );

  const now = new Date();
  const toWrite: { profileId: string; ballotId?: string }[] = [];
  let skipped = 0;
  for (const profile of readyProfiles) {
    const existingId = ballotByProfile.get(profile.id);
    if (existingId && !reseed) {
      skipped += 1;
      continue;
    }
    toWrite.push({ profileId: profile.id, ballotId: existingId });
  }

  const reseedIds = toWrite
    .map((row) => row.ballotId)
    .filter((id): id is string => Boolean(id));
  if (reseedIds.length > 0) {
    await db
      .delete(communityEditionBallotItems)
      .where(inArray(communityEditionBallotItems.ballotId, reseedIds));
    await db
      .delete(communityEditionBallotCategoryVotes)
      .where(inArray(communityEditionBallotCategoryVotes.ballotId, reseedIds));
    await db
      .update(communityEditionBallots)
      .set({ updatedAt: now })
      .where(inArray(communityEditionBallots.id, reseedIds));
  }
  const updatedBallots = reseedIds.length;

  const toCreate = toWrite.filter((row) => !row.ballotId);
  if (toCreate.length > 0) {
    const created = await db
      .insert(communityEditionBallots)
      .values(
        toCreate.map((row) => ({
          editionId: edition.id,
          profileId: row.profileId,
          submittedAt: now,
          updatedAt: now,
        })),
      )
      .returning({
        id: communityEditionBallots.id,
        profileId: communityEditionBallots.profileId,
      });
    for (const ballot of created) {
      ballotByProfile.set(ballot.profileId, ballot.id);
    }
  }
  const createdBallots = toCreate.length;

  const itemRows: {
    ballotId: string;
    gameId: string;
    rank: number;
    blurb: null;
  }[] = [];
  const categoryVoteRows: {
    ballotId: string;
    categoryId: string;
    gameId: string;
  }[] = [];

  for (const row of toWrite) {
    const ballotId = row.ballotId ?? ballotByProfile.get(row.profileId);
    if (!ballotId) continue;
    const picked = weightedSample(pool, effectiveListSize, (g) =>
      weightForRatedGame(g, ratingBias),
    );
    for (let rankIndex = 0; rankIndex < picked.length; rankIndex += 1) {
      const game = picked[rankIndex]!;
      itemRows.push({
        ballotId,
        gameId: game.id,
        rank: rankIndex + 1,
        blurb: null,
      });
    }
    if (categories.length > 0 && picked.length > 0) {
      const catVotes = buildSeedCategoryVotes(categories, picked);
      for (const vote of catVotes) {
        categoryVoteRows.push({
          ballotId,
          categoryId: vote.categoryId,
          gameId: vote.gameId,
        });
      }
    }
  }

  if (itemRows.length > 0) {
    await insertInChunks(
      itemRows,
      (chunk) => db.insert(communityEditionBallotItems).values(chunk),
      SEED_COMMUNITY_INSERT_CHUNK,
    );
  }
  if (categoryVoteRows.length > 0) {
    await insertInChunks(
      categoryVoteRows,
      (chunk) => db.insert(communityEditionBallotCategoryVotes).values(chunk),
      SEED_COMMUNITY_INSERT_CHUNK,
    );
  }

  let resultsRefreshed = false;
  if (refreshPublished && edition.status === "published") {
    const frozen = await rebuildEditionResultsFrozen(edition.id, db);
    if (frozen && "error" in frozen) {
      return {
        error: `Ballots were written, but rebuilding published results failed (${frozen.error}). Use Publish / rebuild results.`,
      };
    }
    const { markEditionFreezeReady } = await import("./edition-freeze");
    await markEditionFreezeReady(edition.id, db);
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
    await db
      .delete(communityHosts)
      .where(
        and(
          eq(communityHosts.communityId, communityId),
          inArray(communityHosts.profileId, seedIds),
        ),
      );
    await db
      .delete(tgaCommunityHosts)
      .where(
        and(
          eq(tgaCommunityHosts.communityId, communityId),
          inArray(tgaCommunityHosts.profileId, seedIds),
        ),
      );
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
    await db
      .delete(communityHosts)
      .where(inArray(communityHosts.profileId, seedIds));
    await db
      .delete(tgaCommunityHosts)
      .where(inArray(tgaCommunityHosts.profileId, seedIds));
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
