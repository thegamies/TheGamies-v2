import { and, asc, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import {
  communityEditionVoices,
  communityHosts,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { computeEditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";

function getDb(): Db {
  return createDb();
}

export type EditionVoicePublic = {
  profileId: string;
  username: string;
  displayName: string;
  designatedAt: Date;
};

export function editionVoicesWriteBlockedReason(
  _status: ReturnType<typeof computeEditionStatus>,
): string | null {
  return null;
}

export async function listEditionVoices(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionVoicePublic[]> {
  const rows = await db
    .select({
      profileId: communityEditionVoices.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      designatedAt: communityEditionVoices.designatedAt,
    })
    .from(communityEditionVoices)
    .innerJoin(profiles, eq(profiles.id, communityEditionVoices.profileId))
    .where(eq(communityEditionVoices.editionId, editionId))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  return rows;
}

export async function listEditionVoiceProfileIds(
  editionId: string,
  db: Db = getDb(),
): Promise<Set<string>> {
  const rows = await db
    .select({ profileId: communityEditionVoices.profileId })
    .from(communityEditionVoices)
    .where(eq(communityEditionVoices.editionId, editionId));
  return new Set(rows.map((r) => r.profileId));
}

export async function setEditionVoice(
  slug: string,
  year: number,
  actorProfileId: string,
  targetProfileId: string,
  isVoice: boolean,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can change the Hosts roster." };
  }

  const edition = await getEditionByCommunityYear(detail.id, year, db);
  if (!edition) return { error: "Event not found." };

  const blocked = editionVoicesWriteBlockedReason(edition.status);
  if (blocked) return { error: blocked };

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

  if (isVoice) {
    await db
      .insert(communityEditionVoices)
      .values({
        editionId: edition.id,
        profileId: targetProfileId,
        designatedAt: new Date(),
        designatedByProfileId: actorProfileId,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(communityEditionVoices)
      .where(
        and(
          eq(communityEditionVoices.editionId, edition.id),
          eq(communityEditionVoices.profileId, targetProfileId),
        ),
      );
  }

  if (edition.status === "closed" || edition.status === "published") {
    const { rebuildEditionHostsResultsFrozen } = await import(
      "./edition-results"
    );
    const rebuilt = await rebuildEditionHostsResultsFrozen(edition.id, db);
    if ("error" in rebuilt) return rebuilt;
  }

  return { ok: true };
}

export type EditionHostMemberRow = {
  profileId: string;
  username: string;
  displayName: string;
  role: "admin" | "member";
  isVoice: boolean;
};

/** Default Manage Hosts list: current community Hosts + this event’s Hosts. Still capped. */
export const EDITION_HOST_ROSTER_LIMIT = 50;
/** Typeahead hits for Manage Hosts — SQL search, not a client filter. */
export const EDITION_HOST_SEARCH_LIMIT = 20;

function mapHostMemberRow(row: {
  profileId: string;
  username: string;
  displayName: string;
  role: string;
  voiceProfileId: string | null;
}): EditionHostMemberRow {
  return {
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    role: row.role === "admin" ? "admin" : "member",
    isVoice: Boolean(row.voiceProfileId),
  };
}

function hostMemberJoins(editionId: string, db: Db) {
  return db
    .select({
      profileId: communityMembers.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      role: communityMembers.role,
      voiceProfileId: communityEditionVoices.profileId,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .leftJoin(
      communityEditionVoices,
      and(
        eq(communityEditionVoices.editionId, editionId),
        eq(communityEditionVoices.profileId, communityMembers.profileId),
      ),
    );
}

export async function listEditionHostRoster(
  communityId: string,
  editionId: string,
  db: Db = getDb(),
): Promise<EditionHostMemberRow[]> {
  const voiceOnEdition = exists(
    db
      .select({ one: sql`1` })
      .from(communityEditionVoices)
      .where(
        and(
          eq(communityEditionVoices.editionId, editionId),
          eq(communityEditionVoices.profileId, communityMembers.profileId),
        ),
      ),
  );
  const currentCommunityHost = exists(
    db
      .select({ one: sql`1` })
      .from(communityHosts)
      .where(
        and(
          eq(communityHosts.communityId, communityId),
          eq(communityHosts.profileId, communityMembers.profileId),
          isNull(communityHosts.retiredAt),
        ),
      ),
  );

  const rows = await hostMemberJoins(editionId, db)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        or(currentCommunityHost, voiceOnEdition),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(EDITION_HOST_ROSTER_LIMIT);

  return rows.map(mapHostMemberRow);
}

/**
 * SQL member search for Manage Hosts. Blank query returns no hits
 * (default roster is a separate query — never dump the full membership).
 */
export async function searchEditionHostMembers(
  communityId: string,
  editionId: string,
  opts: { q: string; limit?: number },
  db?: Db,
): Promise<EditionHostMemberRow[]> {
  const q = opts.q.trim();
  if (q.length < 1) return [];

  const database = db ?? getDb();
  const limit = Math.min(
    EDITION_HOST_SEARCH_LIMIT,
    Math.max(1, opts.limit ?? EDITION_HOST_SEARCH_LIMIT),
  );
  const term = `%${q}%`;

  const rows = await hostMemberJoins(editionId, database)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        or(ilike(profiles.displayName, term), ilike(profiles.username, term)),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(limit);

  return rows.map(mapHostMemberRow);
}

/** Used by freeze to resolve voice set without joining twice. */
export async function listEditionVoicesForProfiles(
  editionId: string,
  profileIds: string[],
  db: Db = getDb(),
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();
  const rows = await db
    .select({ profileId: communityEditionVoices.profileId })
    .from(communityEditionVoices)
    .where(
      and(
        eq(communityEditionVoices.editionId, editionId),
        inArray(communityEditionVoices.profileId, profileIds),
      ),
    );
  return new Set(rows.map((r) => r.profileId));
}
