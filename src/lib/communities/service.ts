import { and, asc, count, desc, eq } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { canManageCommunity, leaveBlockedReason } from "./rules";
import {
  parseCreateCommunityInput,
  type CommunityRole,
} from "./schema";
import { parseScoresVisibleDateInput } from "./live-reveal";

export type Community = typeof communities.$inferSelect;
export type CommunityMemberRow = typeof communityMembers.$inferSelect;

export type CommunitySummary = Community & { memberCount: number };

export type CommunityMemberPublic = {
  profileId: string;
  username: string;
  displayName: string;
  role: CommunityRole;
  joinedAt: Date;
};

export type CommunityDetail = Community & {
  memberCount: number;
  members: CommunityMemberPublic[];
  viewerRole: CommunityRole | null;
};

export type ProfileCommunity = {
  slug: string;
  name: string;
};

function getDb(): Db {
  return createDb();
}

function asRole(raw: string): CommunityRole {
  return raw === "admin" ? "admin" : "member";
}

export async function listCommunities(
  db: Db = getDb(),
): Promise<CommunitySummary[]> {
  const rows = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      name: communities.name,
      description: communities.description,
      createdByProfileId: communities.createdByProfileId,
      liveRankingsEnabled: communities.liveRankingsEnabled,
      liveScoresVisibleFrom: communities.liveScoresVisibleFrom,
      createdAt: communities.createdAt,
      updatedAt: communities.updatedAt,
      memberCount: count(communityMembers.profileId),
    })
    .from(communities)
    .leftJoin(
      communityMembers,
      eq(communityMembers.communityId, communities.id),
    )
    .groupBy(communities.id)
    .orderBy(desc(communities.createdAt), asc(communities.name));

  return rows.map((row) => ({
    ...row,
    memberCount: Number(row.memberCount),
  }));
}

export async function listCommunitiesForProfile(
  profileId: string,
  db: Db = getDb(),
): Promise<ProfileCommunity[]> {
  return db
    .select({
      slug: communities.slug,
      name: communities.name,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.profileId, profileId))
    .orderBy(asc(communities.name));
}

export async function getCommunityBySlug(
  slug: string,
  viewerProfileId?: string | null,
  db: Db = getDb(),
): Promise<CommunityDetail | null> {
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug.trim().toLowerCase()))
    .limit(1);
  if (!community) return null;

  const memberRows = await db
    .select({
      profileId: communityMembers.profileId,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(eq(communityMembers.communityId, community.id))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  const members: CommunityMemberPublic[] = memberRows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    role: asRole(row.role),
    joinedAt: row.joinedAt,
  }));

  const viewer = viewerProfileId
    ? members.find((m) => m.profileId === viewerProfileId)
    : undefined;

  return {
    ...community,
    memberCount: members.length,
    members,
    viewerRole: viewer?.role ?? null,
  };
}

export async function createCommunity(
  profileId: string,
  input: unknown,
  db: Db = getDb(),
): Promise<Community | { error: string }> {
  const parsed = parseCreateCommunityInput(input);
  if ("error" in parsed) return parsed;

  const [existing] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.slug, parsed.slug))
    .limit(1);
  if (existing) {
    return { error: "That slug is already taken." };
  }

  const [created] = await db
    .insert(communities)
    .values({
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description ?? "",
      createdByProfileId: profileId,
    })
    .returning();
  if (!created) {
    return { error: "Could not create that community." };
  }

  try {
    await db.insert(communityMembers).values({
      communityId: created.id,
      profileId,
      role: "admin",
    });
  } catch {
    await db.delete(communities).where(eq(communities.id, created.id));
    return { error: "Could not create that community." };
  }

  return created;
}

export async function joinCommunity(
  slug: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (detail.viewerRole) return { ok: true };

  try {
    await db.insert(communityMembers).values({
      communityId: detail.id,
      profileId,
      role: "member",
    });
  } catch {
    return { error: "Could not join that community." };
  }
  return { ok: true };
}

export async function leaveCommunity(
  slug: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!detail.viewerRole) return { ok: true };

  const adminCount = detail.members.filter((m) => m.role === "admin").length;
  const blocked = leaveBlockedReason(detail.viewerRole, adminCount);
  if (blocked) return { error: blocked };

  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, profileId),
      ),
    );
  return { ok: true };
}

export async function setLiveRankingsEnabled(
  slug: string,
  profileId: string,
  enabled: boolean,
  db: Db = getDb(),
): Promise<{ ok: true; liveRankingsEnabled: boolean } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can change live rankings." };
  }

  const [updated] = await db
    .update(communities)
    .set({
      liveRankingsEnabled: enabled,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({ liveRankingsEnabled: communities.liveRankingsEnabled });

  return {
    ok: true,
    liveRankingsEnabled: updated?.liveRankingsEnabled ?? enabled,
  };
}

export async function setCommunityLiveScoresVisibleFrom(
  slug: string,
  profileId: string,
  input: { mode: "hide" } | { mode: "now" } | { mode: "date"; date: string },
  db?: Db,
): Promise<{ ok: true; liveScoresVisibleFrom: Date | null } | { error: string }> {
  const conn = db ?? getDb();
  const detail = await getCommunityBySlug(slug, profileId, conn);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can change when scores are shown." };
  }

  let liveScoresVisibleFrom: Date | null;
  if (input.mode === "hide") {
    liveScoresVisibleFrom = null;
  } else if (input.mode === "now") {
    liveScoresVisibleFrom = new Date();
  } else {
    const parsed = parseScoresVisibleDateInput(input.date);
    if ("error" in parsed) return { error: parsed.error };
    liveScoresVisibleFrom = parsed.date;
  }

  const [updated] = await conn
    .update(communities)
    .set({
      liveScoresVisibleFrom,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({ liveScoresVisibleFrom: communities.liveScoresVisibleFrom });

  return {
    ok: true,
    liveScoresVisibleFrom: updated?.liveScoresVisibleFrom ?? liveScoresVisibleFrom,
  };
}
