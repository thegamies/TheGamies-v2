import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  communityMembers,
  createDb,
  profiles,
  tgaCommunityHosts,
  tgaCommunityYears,
  tgaYears,
  type Db,
} from "@thegamies/db";
import {
  EDITION_HOST_ROSTER_LIMIT,
  EDITION_HOST_SEARCH_LIMIT,
} from "@/lib/communities/voices";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";
import { computeTgaStatus, type TgaStatus } from "./status";

function getDb(): Db {
  return createDb();
}

export type TgaHostMemberRow = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
};

export function tgaStatusSyncsCommunityHosts(status: TgaStatus): boolean {
  return status === "draft" || status === "scheduled" || status === "open";
}

async function listSyncableTgaYears(
  communityId: string,
  db: Db,
): Promise<number[]> {
  const rows = await db
    .select({
      year: tgaCommunityYears.year,
      enabled: tgaYears.enabled,
      opensAt: tgaYears.opensAt,
      showStartsAt: tgaYears.showStartsAt,
    })
    .from(tgaCommunityYears)
    .innerJoin(tgaYears, eq(tgaYears.year, tgaCommunityYears.year))
    .where(eq(tgaCommunityYears.communityId, communityId));

  return rows
    .filter((row) => tgaStatusSyncsCommunityHosts(computeTgaStatus(row)))
    .map((row) => row.year);
}

export async function seedTgaCommunityHostsFromCurrent(
  communityId: string,
  year: number,
  profileIds: string[],
  designatedByProfileId: string | null,
  db: Db = getDb(),
): Promise<void> {
  if (profileIds.length === 0) return;
  const designatedAt = new Date();
  await db
    .insert(tgaCommunityHosts)
    .values(
      profileIds.map((profileId) => ({
        communityId,
        year,
        profileId,
        designatedAt,
        designatedByProfileId,
      })),
    )
    .onConflictDoNothing();
}

export async function syncTgaHostOnSyncableYears(
  communityId: string,
  profileId: string,
  designatedByProfileId: string | null,
  db: Db = getDb(),
): Promise<void> {
  const years = await listSyncableTgaYears(communityId, db);
  if (years.length === 0) return;
  const designatedAt = new Date();
  await db
    .insert(tgaCommunityHosts)
    .values(
      years.map((year) => ({
        communityId,
        year,
        profileId,
        designatedAt,
        designatedByProfileId,
      })),
    )
    .onConflictDoNothing();
}

export async function removeTgaHostFromSyncableYears(
  communityId: string,
  profileId: string,
  db: Db = getDb(),
): Promise<void> {
  const years = await listSyncableTgaYears(communityId, db);
  if (years.length === 0) return;
  await db
    .delete(tgaCommunityHosts)
    .where(
      and(
        eq(tgaCommunityHosts.communityId, communityId),
        eq(tgaCommunityHosts.profileId, profileId),
        inArray(tgaCommunityHosts.year, years),
      ),
    );
}

export async function listTgaCommunityHostRoster(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<TgaHostMemberRow[]> {
  const rows = await db
    .select({
      profileId: tgaCommunityHosts.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(tgaCommunityHosts)
    .innerJoin(profiles, eq(profiles.id, tgaCommunityHosts.profileId))
    .where(
      and(
        eq(tgaCommunityHosts.communityId, communityId),
        eq(tgaCommunityHosts.year, year),
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

export async function searchTgaCommunityHostMembers(
  communityId: string,
  year: number,
  opts: { q: string; limit?: number },
  db?: Db,
): Promise<TgaHostMemberRow[]> {
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
      hostProfileId: tgaCommunityHosts.profileId,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .leftJoin(
      tgaCommunityHosts,
      and(
        eq(tgaCommunityHosts.communityId, communityId),
        eq(tgaCommunityHosts.year, year),
        eq(tgaCommunityHosts.profileId, communityMembers.profileId),
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
    isHost: Boolean(row.hostProfileId),
  }));
}

export async function setTgaCommunityHost(
  slug: string,
  year: number,
  actorProfileId: string,
  targetProfileId: string,
  isHost: boolean,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can change the Hosts roster." };
  }

  const [opted] = await db
    .select({ year: tgaCommunityYears.year })
    .from(tgaCommunityYears)
    .where(
      and(
        eq(tgaCommunityYears.communityId, detail.id),
        eq(tgaCommunityYears.year, year),
      ),
    )
    .limit(1);
  if (!opted) {
    return { error: "This community is not running that year." };
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

  if (isHost) {
    await db
      .insert(tgaCommunityHosts)
      .values({
        communityId: detail.id,
        year,
        profileId: targetProfileId,
        designatedAt: new Date(),
        designatedByProfileId: actorProfileId,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(tgaCommunityHosts)
      .where(
        and(
          eq(tgaCommunityHosts.communityId, detail.id),
          eq(tgaCommunityHosts.year, year),
          eq(tgaCommunityHosts.profileId, targetProfileId),
        ),
      );
  }
  return { ok: true };
}
