import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  canManageCommunity,
  leaveBlockedReason,
  setCommunityRoleBlockedReason,
} from "./rules";
import {
  communitySlugWithSuffix,
  parseCreateCommunityInput,
  type CommunityRole,
} from "./schema";
import { parseScoresVisibleDateInput } from "./live-reveal";
import {
  clearCommunityLiveLockSnapshots,
  upsertCommunityLiveLockSnapshot,
} from "./live";
import {
  COMMUNITY_MEMBERS_PAGE_SIZE,
  paginateCommunityMembers,
} from "./members-page";

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
  hostCount: number;
  viewerRole: CommunityRole | null;
};

export type CommunityMembersPage = {
  members: CommunityMemberPublic[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export { COMMUNITY_MEMBERS_PAGE_SIZE, paginateCommunityMembers } from "./members-page";

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
      liveRankingsLocked: communities.liveRankingsLocked,
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

  const memberWhere = eq(communityMembers.communityId, community.id);
  const [memberCountRows, hostCountRows, viewerRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(communityMembers)
      .where(memberWhere),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(communityMembers)
      .where(and(memberWhere, eq(communityMembers.role, "admin"))),
    viewerProfileId
      ? db
          .select({ role: communityMembers.role })
          .from(communityMembers)
          .where(
            and(
              memberWhere,
              eq(communityMembers.profileId, viewerProfileId),
            ),
          )
          .limit(1)
      : Promise.resolve([] as { role: string }[]),
  ]);

  return {
    ...community,
    memberCount: Number(memberCountRows[0]?.n ?? 0),
    hostCount: Number(hostCountRows[0]?.n ?? 0),
    viewerRole: viewerRows[0] ? asRole(viewerRows[0].role) : null,
  };
}

export async function listCommunityMembersPage(
  communityId: string,
  pageRaw: number,
  opts: { q?: string; db?: Db } = {},
): Promise<CommunityMembersPage> {
  const db = opts.db ?? getDb();
  const q = opts.q?.trim() ?? "";
  const search =
    q.length > 0
      ? or(
          sql`${profiles.displayName} ILIKE ${`%${q}%`}`,
          sql`${profiles.username} ILIKE ${`%${q}%`}`,
        )
      : undefined;
  const where = search
    ? and(eq(communityMembers.communityId, communityId), search)
    : eq(communityMembers.communityId, communityId);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(where);
  const total = Number(countRow?.n ?? 0);
  const { page, offset, totalPages } = paginateCommunityMembers(
    pageRaw,
    total,
  );

  const rows = await db
    .select({
      profileId: communityMembers.profileId,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(where)
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(COMMUNITY_MEMBERS_PAGE_SIZE)
    .offset(offset);

  return {
    members: rows.map((row) => ({
      profileId: row.profileId,
      username: row.username,
      displayName: row.displayName,
      role: asRole(row.role),
      joinedAt: row.joinedAt,
    })),
    page,
    pageSize: COMMUNITY_MEMBERS_PAGE_SIZE,
    total,
    totalPages,
  };
}

export async function listCommunityMemberOptions(
  communityId: string,
  db: Db = getDb(),
): Promise<CommunityMemberPublic[]> {
  const rows = await db
    .select({
      profileId: communityMembers.profileId,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(eq(communityMembers.communityId, communityId))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    role: asRole(row.role),
    joinedAt: row.joinedAt,
  }));
}

export async function createCommunity(
  profileId: string,
  input: unknown,
  db: Db = getDb(),
): Promise<Community | { error: string }> {
  const parsed = parseCreateCommunityInput(input);
  if ("error" in parsed) return parsed;

  let slug = parsed.slug;
  for (let n = 1; n <= 50; n += 1) {
    const candidate = communitySlugWithSuffix(parsed.slug, n);
    const [existing] = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.slug, candidate))
      .limit(1);
    if (!existing) {
      slug = candidate;
      break;
    }
    if (n === 50) {
      return { error: "Could not create that community." };
    }
  }

  const [created] = await db
    .insert(communities)
    .values({
      slug,
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

  const blocked = leaveBlockedReason(detail.viewerRole, detail.hostCount);
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

export async function setCommunityMemberRole(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
  nextRole: CommunityRole,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };

  const [target] = await db
    .select({
      profileId: communityMembers.profileId,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
      ),
    )
    .limit(1);

  const blocked = setCommunityRoleBlockedReason({
    actorCanManage: canManageCommunity(detail.viewerRole),
    targetIsMember: Boolean(target),
    targetRole: target ? asRole(target.role) : "member",
    nextRole,
    hostCount: detail.hostCount,
  });
  if (blocked) return { error: blocked };
  if (!target) return { error: "Only community members can be hosts." };
  if (asRole(target.role) === nextRole) return { ok: true };

  await db
    .update(communityMembers)
    .set({ role: nextRole })
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
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
      ...(enabled
        ? {}
        : { liveRankingsLocked: false }),
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({ liveRankingsEnabled: communities.liveRankingsEnabled });

  if (!enabled) {
    await clearCommunityLiveLockSnapshots(detail.id, db);
  }

  return {
    ok: true,
    liveRankingsEnabled: updated?.liveRankingsEnabled ?? enabled,
  };
}

export async function setLiveRankingsLocked(
  slug: string,
  profileId: string,
  locked: boolean,
  db: Db = getDb(),
): Promise<{ ok: true; liveRankingsLocked: boolean } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can lock or unlock live rankings." };
  }
  if (!detail.liveRankingsEnabled && locked) {
    return { error: "Turn live rankings on before locking them." };
  }

  if (locked) {
    await clearCommunityLiveLockSnapshots(detail.id, db);
    await upsertCommunityLiveLockSnapshot(
      detail.id,
      new Date().getUTCFullYear(),
      db,
    );
  } else {
    await clearCommunityLiveLockSnapshots(detail.id, db);
  }

  const [updated] = await db
    .update(communities)
    .set({
      liveRankingsLocked: locked,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({ liveRankingsLocked: communities.liveRankingsLocked });

  return {
    ok: true,
    liveRankingsLocked: updated?.liveRankingsLocked ?? locked,
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
