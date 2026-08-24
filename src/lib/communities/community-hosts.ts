import { and, asc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import {
  communityEditions,
  communityEditionVoices,
  communityHosts,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { computeEditionStatus, type EditionStatus } from "./edition-status";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";
import {
  EDITION_HOST_ROSTER_LIMIT,
  EDITION_HOST_SEARCH_LIMIT,
} from "./voices";
import {
  removeTgaHostFromSyncableYears,
  seedTgaCommunityHostsFromCurrent,
  syncTgaHostOnSyncableYears,
} from "@/lib/tga-pickem/community-hosts";

function getDb(): Db {
  return createDb();
}

export type CommunityHostMemberRow = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
};

export function editionStatusSyncsCommunityHosts(
  status: EditionStatus,
): boolean {
  return status === "draft" || status === "open";
}

export async function listCurrentHostProfileIds(
  communityId: string,
  db: Db = getDb(),
): Promise<string[]> {
  const rows = await db
    .select({ profileId: communityHosts.profileId })
    .from(communityHosts)
    .where(
      and(
        eq(communityHosts.communityId, communityId),
        isNull(communityHosts.retiredAt),
      ),
    );
  return rows.map((row) => row.profileId);
}

export async function listCurrentCommunityHosts(
  communityId: string,
  db: Db = getDb(),
): Promise<CommunityHostMemberRow[]> {
  const rows = await db
    .select({
      profileId: communityHosts.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(communityHosts)
    .innerJoin(profiles, eq(profiles.id, communityHosts.profileId))
    .where(
      and(
        eq(communityHosts.communityId, communityId),
        isNull(communityHosts.retiredAt),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(EDITION_HOST_ROSTER_LIMIT);

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isHost: true,
  }));
}

export async function searchCommunityMembersForHost(
  communityId: string,
  opts: { q: string; limit?: number },
  db?: Db,
): Promise<CommunityHostMemberRow[]> {
  const q = opts.q.trim();
  if (q.length < 1) return [];
  const database = db ?? getDb();

  const limit = Math.min(
    EDITION_HOST_SEARCH_LIMIT,
    Math.max(1, opts.limit ?? EDITION_HOST_SEARCH_LIMIT),
  );
  const term = `%${q}%`;

  const rows = await database
    .select({
      profileId: communityMembers.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      hostProfileId: communityHosts.profileId,
      retiredAt: communityHosts.retiredAt,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .leftJoin(
      communityHosts,
      and(
        eq(communityHosts.communityId, communityId),
        eq(communityHosts.profileId, communityMembers.profileId),
      ),
    )
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        or(ilike(profiles.displayName, term), ilike(profiles.username, term)),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(limit);

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isHost: Boolean(row.hostProfileId) && row.retiredAt == null,
  }));
}

export async function seedEditionVoicesFromCurrentHosts(
  editionId: string,
  communityId: string,
  designatedByProfileId: string | null,
  db: Db = getDb(),
): Promise<void> {
  const profileIds = await listCurrentHostProfileIds(communityId, db);
  if (profileIds.length === 0) return;
  const designatedAt = new Date();
  await db
    .insert(communityEditionVoices)
    .values(
      profileIds.map((profileId) => ({
        editionId,
        profileId,
        designatedAt,
        designatedByProfileId,
      })),
    )
    .onConflictDoNothing();
}

async function listSyncableEditionIds(
  communityId: string,
  db: Db,
): Promise<string[]> {
  const editions = await db
    .select({
      id: communityEditions.id,
      opensAt: communityEditions.opensAt,
      closesAt: communityEditions.closesAt,
      publishesAt: communityEditions.publishesAt,
    })
    .from(communityEditions)
    .where(eq(communityEditions.communityId, communityId));

  return editions
    .filter((edition) =>
      editionStatusSyncsCommunityHosts(computeEditionStatus(edition)),
    )
    .map((edition) => edition.id);
}

async function addVoiceToEditions(
  editionIds: string[],
  profileId: string,
  designatedByProfileId: string | null,
  db: Db,
): Promise<void> {
  if (editionIds.length === 0) return;
  const designatedAt = new Date();
  await db
    .insert(communityEditionVoices)
    .values(
      editionIds.map((editionId) => ({
        editionId,
        profileId,
        designatedAt,
        designatedByProfileId,
      })),
    )
    .onConflictDoNothing();
}

async function removeVoiceFromEditions(
  editionIds: string[],
  profileId: string,
  db: Db,
): Promise<void> {
  if (editionIds.length === 0) return;
  await db
    .delete(communityEditionVoices)
    .where(
      and(
        eq(communityEditionVoices.profileId, profileId),
        inArray(communityEditionVoices.editionId, editionIds),
      ),
    );
}

export async function promoteCommunityHost(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can promote Hosts." };
  }

  const [member] = await db
    .select({ profileId: communityMembers.profileId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
      ),
    )
    .limit(1);
  if (!member) {
    return { error: "Only community members can be Hosts." };
  }

  const now = new Date();
  await db
    .insert(communityHosts)
    .values({
      communityId: detail.id,
      profileId: targetProfileId,
      promotedAt: now,
      promotedByProfileId: actorProfileId,
      retiredAt: null,
      retiredByProfileId: null,
    })
    .onConflictDoUpdate({
      target: [communityHosts.communityId, communityHosts.profileId],
      set: {
        promotedAt: now,
        promotedByProfileId: actorProfileId,
        retiredAt: null,
        retiredByProfileId: null,
      },
    });

  const editionIds = await listSyncableEditionIds(detail.id, db);
  await addVoiceToEditions(editionIds, targetProfileId, actorProfileId, db);
  await syncTgaHostOnSyncableYears(
    detail.id,
    targetProfileId,
    actorProfileId,
    db,
  );
  return { ok: true };
}

export async function retireCommunityHost(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can retire Hosts." };
  }

  await retireCommunityHostInCommunity(
    detail.id,
    targetProfileId,
    actorProfileId,
    db,
  );
  return { ok: true };
}

/** Retire if they are a current Host. Safe when they are not. */
export async function retireCommunityHostInCommunity(
  communityId: string,
  targetProfileId: string,
  actorProfileId: string | null,
  db: Db = getDb(),
): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(communityHosts)
    .set({
      retiredAt: now,
      retiredByProfileId: actorProfileId,
    })
    .where(
      and(
        eq(communityHosts.communityId, communityId),
        eq(communityHosts.profileId, targetProfileId),
        isNull(communityHosts.retiredAt),
      ),
    )
    .returning({ profileId: communityHosts.profileId });

  const editionIds = await listSyncableEditionIds(communityId, db);
  await removeVoiceFromEditions(editionIds, targetProfileId, db);
  await removeTgaHostFromSyncableYears(communityId, targetProfileId, db);
  void updated;
}

/** Retire this person as a current Host in every community (account delete). */
export async function retireCommunityHostEverywhere(
  profileId: string,
  db: Db = getDb(),
): Promise<void> {
  const rows = await db
    .select({ communityId: communityHosts.communityId })
    .from(communityHosts)
    .where(
      and(
        eq(communityHosts.profileId, profileId),
        isNull(communityHosts.retiredAt),
      ),
    );
  for (const row of rows) {
    await retireCommunityHostInCommunity(row.communityId, profileId, null, db);
  }
}

export async function seedTgaHostsOnOptIn(
  communityId: string,
  year: number,
  designatedByProfileId: string | null,
  db: Db = getDb(),
): Promise<void> {
  const profileIds = await listCurrentHostProfileIds(communityId, db);
  await seedTgaCommunityHostsFromCurrent(
    communityId,
    year,
    profileIds,
    designatedByProfileId,
    db,
  );
}
