import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  communities,
  communityBans,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import {
  PROFILE_COMMUNITIES_PAGE_SIZE,
  paginateProfileItems,
} from "@/lib/profile/profile-page";
import {
  canManageCommunity,
  canSeeCommunityInvite,
  COMMUNITY_ADMIN_ROSTER_LIMIT,
  COMMUNITY_ADMIN_SEARCH_LIMIT,
  leaveBlockedReason,
  setCommunityRoleBlockedReason,
} from "./rules";
import {
  communityDescriptionSchema,
  communityNameSchema,
  communitySlugWithSuffix,
  communityVisibilitySchema,
  parseCreateCommunityInput,
  asCommunityVisibility,
  isCommunityPublic,
  type CommunityRole,
  type CommunityVisibility,
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
import {
  generateInviteCode,
  parseInviteCode,
} from "./invite-code";
import {
  mergeSocialLinks,
  socialLinksForStorage,
  validateAndNormalizeSocialLinksPatch,
} from "@/lib/profile/social-links";

export type Community = typeof communities.$inferSelect;
export type CommunityMemberRow = typeof communityMembers.$inferSelect;

export type MembershipCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
};

export type MembershipCommunitiesPage = {
  communities: MembershipCommunity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CommunityMemberPublic = {
  profileId: string;
  username: string;
  displayName: string;
  role: CommunityRole;
  joinedAt: Date;
};

export type CommunityDetail = Omit<Community, "inviteCode"> & {
  memberCount: number;
  hostCount: number;
  viewerRole: CommunityRole | null;
  /** Present when open invites is on and the viewer is a member. */
  viewerInviteCode: string | null;
  /** Present for community admins (Settings → Invite). */
  adminInviteCode: string | null;
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
  id: string;
  slug: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
};

export type ProfileCommunitiesPage = {
  communities: ProfileCommunity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function getDb(): Db {
  return createDb();
}

function asRole(raw: string): CommunityRole {
  return raw === "admin" ? "admin" : "member";
}

function toCommunityDetail(
  community: Community,
  memberCount: number,
  hostCount: number,
  viewerRole: CommunityRole | null,
): CommunityDetail {
  const { inviteCode, ...rest } = community;
  return {
    ...rest,
    memberCount,
    hostCount,
    viewerRole,
    viewerInviteCode: canSeeCommunityInvite(viewerRole, community.openInvites)
      ? inviteCode
      : null,
    adminInviteCode: viewerRole === "admin" ? inviteCode : null,
  };
}

export async function listMembershipCommunitiesPage(
  profileId: string,
  pageRaw: number,
  db: Db = getDb(),
): Promise<MembershipCommunitiesPage> {
  const pageSize = PROFILE_COMMUNITIES_PAGE_SIZE;
  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityMembers)
    .where(eq(communityMembers.profileId, profileId));
  const total = Number(countRow?.n ?? 0);
  const { page, offset, totalPages } = paginateProfileItems(
    pageRaw,
    total,
    pageSize,
  );

  const rows = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      name: communities.name,
      description: communities.description,
      avatarUrl: communities.avatarUrl,
      bannerUrl: communities.bannerUrl,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.profileId, profileId))
    .orderBy(asc(communities.name))
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((row) => row.id);
  const countRows =
    ids.length === 0
      ? []
      : await db
          .select({
            communityId: communityMembers.communityId,
            n: sql<number>`count(*)::int`,
          })
          .from(communityMembers)
          .where(inArray(communityMembers.communityId, ids))
          .groupBy(communityMembers.communityId);
  const countById = new Map(
    countRows.map((row) => [row.communityId, Number(row.n)]),
  );

  return {
    communities: rows.map((row) => ({
      ...row,
      memberCount: countById.get(row.id) ?? 0,
    })),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function listCommunitiesForProfile(
  profileId: string,
  db: Db = getDb(),
): Promise<ProfileCommunity[]> {
  const page = await listCommunitiesForProfilePage(profileId, 1, db);
  return page.communities;
}

export async function listCommunitiesForProfilePage(
  profileId: string,
  pageRaw: number,
  db: Db = getDb(),
): Promise<ProfileCommunitiesPage> {
  const pageSize = PROFILE_COMMUNITIES_PAGE_SIZE;
  const publicMembership = and(
    eq(communityMembers.profileId, profileId),
    eq(communities.visibility, "public"),
  );
  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(publicMembership);
  const total = Number(countRow?.n ?? 0);
  const { page, offset, totalPages } = paginateProfileItems(
    pageRaw,
    total,
    pageSize,
  );

  const rows = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      name: communities.name,
      description: communities.description,
      avatarUrl: communities.avatarUrl,
      bannerUrl: communities.bannerUrl,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(publicMembership)
    .orderBy(asc(communities.name))
    .limit(pageSize)
    .offset(offset);

  const ids = rows.map((row) => row.id);
  const countRows =
    ids.length === 0
      ? []
      : await db
          .select({
            communityId: communityMembers.communityId,
            n: sql<number>`count(*)::int`,
          })
          .from(communityMembers)
          .where(inArray(communityMembers.communityId, ids))
          .groupBy(communityMembers.communityId);
  const countById = new Map(
    countRows.map((row) => [row.communityId, Number(row.n)]),
  );

  return {
    communities: rows.map((row) => ({
      ...row,
      memberCount: countById.get(row.id) ?? 0,
    })),
    page,
    pageSize,
    total,
    totalPages,
  };
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

  return toCommunityDetail(
    community,
    Number(memberCountRows[0]?.n ?? 0),
    Number(hostCountRows[0]?.n ?? 0),
    viewerRows[0] ? asRole(viewerRows[0].role) : null,
  );
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

  let created: Community | undefined;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const [row] = await db
        .insert(communities)
        .values({
          slug,
          name: parsed.name,
          description: parsed.description ?? "",
          visibility: parsed.visibility,
          createdByProfileId: profileId,
          inviteCode: generateInviteCode(),
        })
        .returning();
      created = row;
      break;
    } catch {
      if (attempt === 8) {
        return { error: "Could not create that community." };
      }
    }
  }
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

export async function getCommunityInvitePreview(
  codeRaw: string,
  viewerProfileId?: string | null,
  db: Db = getDb(),
): Promise<{
  name: string;
  slug: string;
  alreadyMember: boolean;
} | null> {
  const code = parseInviteCode(codeRaw);
  if (!code) return null;

  const [community] = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      name: communities.name,
    })
    .from(communities)
    .where(eq(communities.inviteCode, code))
    .limit(1);
  if (!community) return null;

  let alreadyMember = false;
  if (viewerProfileId) {
    const [member] = await db
      .select({ profileId: communityMembers.profileId })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.profileId, viewerProfileId),
        ),
      )
      .limit(1);
    alreadyMember = Boolean(member);
  }

  return {
    name: community.name,
    slug: community.slug,
    alreadyMember,
  };
}

export async function joinCommunityWithInvite(
  codeRaw: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{ ok: true; slug: string } | { error: string }> {
  const code = parseInviteCode(codeRaw);
  if (!code) return { error: "That invite is not valid." };

  const [community] = await db
    .select({
      id: communities.id,
      slug: communities.slug,
    })
    .from(communities)
    .where(eq(communities.inviteCode, code))
    .limit(1);
  if (!community) return { error: "That invite is not valid." };

  return joinCommunityAsMember(community.id, community.slug, profileId, db);
}

/** Open join for public communities (no invite code). */
export async function joinCommunityPublic(
  slug: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{ ok: true; slug: string } | { error: string }> {
  const [community] = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      visibility: communities.visibility,
    })
    .from(communities)
    .where(eq(communities.slug, slug.trim().toLowerCase()))
    .limit(1);
  if (!community) return { error: "Community not found." };
  if (!isCommunityPublic(community.visibility)) {
    return { error: "This community is private. You need an invite to join." };
  }

  return joinCommunityAsMember(community.id, community.slug, profileId, db);
}

async function joinCommunityAsMember(
  communityId: string,
  slug: string,
  profileId: string,
  db: Db,
): Promise<{ ok: true; slug: string } | { error: string }> {
  const [existing] = await db
    .select({ profileId: communityMembers.profileId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.profileId, profileId),
      ),
    )
    .limit(1);
  if (existing) return { ok: true, slug };

  const [banned] = await db
    .select({ profileId: communityBans.profileId })
    .from(communityBans)
    .where(
      and(
        eq(communityBans.communityId, communityId),
        eq(communityBans.profileId, profileId),
      ),
    )
    .limit(1);
  if (banned) return { error: "You can’t join this community." };

  try {
    await db.insert(communityMembers).values({
      communityId,
      profileId,
      role: "member",
    });
  } catch {
    return { error: "Could not join that community." };
  }
  return { ok: true, slug };
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

export async function setCommunityImageUrl(
  slug: string,
  profileId: string,
  input: {
    kind: "avatar" | "banner";
    imageUrl: string | null;
  },
  db: Db = getDb(),
): Promise<
  | { ok: true; avatarUrl: string | null; bannerUrl: string | null }
  | { error: string }
> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can update community images." };
  }

  const patch =
    input.kind === "avatar"
      ? { avatarUrl: input.imageUrl }
      : { bannerUrl: input.imageUrl };

  const [updated] = await db
    .update(communities)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({
      avatarUrl: communities.avatarUrl,
      bannerUrl: communities.bannerUrl,
    });

  return {
    ok: true,
    avatarUrl: updated?.avatarUrl ?? detail.avatarUrl,
    bannerUrl: updated?.bannerUrl ?? detail.bannerUrl,
  };
}

export async function rotateCommunityInviteCode(
  slug: string,
  profileId: string,
  db: Db = getDb(),
): Promise<{ ok: true; inviteCode: string } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can update invites." };
  }

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      const [updated] = await db
        .update(communities)
        .set({
          inviteCode,
          updatedAt: new Date(),
        })
        .where(eq(communities.id, detail.id))
        .returning({ inviteCode: communities.inviteCode });
      if (updated) {
        return { ok: true, inviteCode: updated.inviteCode };
      }
    } catch {
      if (attempt === 8) {
        return { error: "Could not generate a new invite." };
      }
    }
  }
  return { error: "Could not generate a new invite." };
}

export async function setCommunityOpenInvites(
  slug: string,
  profileId: string,
  enabled: boolean,
  db: Db = getDb(),
): Promise<{ ok: true; openInvites: boolean } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can update invites." };
  }

  const [updated] = await db
    .update(communities)
    .set({
      openInvites: enabled,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id))
    .returning({ openInvites: communities.openInvites });

  return {
    ok: true,
    openInvites: updated?.openInvites ?? enabled,
  };
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

export async function updateCommunityIdentity(
  slug: string,
  profileId: string,
  input: {
    name: string;
    description: string;
    visibility?: unknown;
    socialLinks?: unknown;
  },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can edit this community." };
  }

  const nameParsed = communityNameSchema.safeParse(input.name);
  if (!nameParsed.success) {
    return { error: nameParsed.error.issues[0]?.message ?? "Enter a name." };
  }
  const descParsed = communityDescriptionSchema.safeParse(input.description);
  if (!descParsed.success) {
    return {
      error: descParsed.error.issues[0]?.message ?? "Description is too long.",
    };
  }

  let visibility: CommunityVisibility = asCommunityVisibility(detail.visibility);
  if (input.visibility !== undefined) {
    const visParsed = communityVisibilitySchema.safeParse(input.visibility);
    if (!visParsed.success) {
      return { error: "Choose public or private." };
    }
    visibility = visParsed.data;
  }

  let socialLinks: Record<string, string> | null = detail.socialLinks;
  if (input.socialLinks !== undefined) {
    try {
      const patch = validateAndNormalizeSocialLinksPatch(input.socialLinks);
      const merged = mergeSocialLinks(detail.socialLinks, patch);
      const stored = socialLinksForStorage(merged);
      socialLinks = Object.keys(stored).length > 0 ? stored : null;
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Social links could not be saved.",
      };
    }
  }

  await db
    .update(communities)
    .set({
      name: nameParsed.data,
      description: descParsed.data,
      visibility,
      socialLinks,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, detail.id));

  return { ok: true };
}

export type CommunityAdminMemberRow = {
  profileId: string;
  username: string;
  displayName: string;
  role: CommunityRole;
};

export async function listCommunityAdminRoster(
  communityId: string,
  db: Db = getDb(),
): Promise<CommunityAdminMemberRow[]> {
  const rows = await db
    .select({
      profileId: communityMembers.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, "admin"),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(COMMUNITY_ADMIN_ROSTER_LIMIT);

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    role: asRole(row.role),
  }));
}

/**
 * SQL member search for Community Admins. Blank query returns no hits
 * (default roster is a separate query — never dump the full membership).
 */
export async function searchCommunityMembersForAdmin(
  communityId: string,
  opts: { q: string; limit?: number },
  db?: Db,
): Promise<CommunityAdminMemberRow[]> {
  const q = opts.q.trim();
  if (q.length < 1) return [];

  const database = db ?? getDb();
  const limit = Math.min(
    COMMUNITY_ADMIN_SEARCH_LIMIT,
    Math.max(1, opts.limit ?? COMMUNITY_ADMIN_SEARCH_LIMIT),
  );
  const term = `%${q}%`;

  const rows = await database
    .select({
      profileId: communityMembers.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      role: communityMembers.role,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
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
    role: asRole(row.role),
  }));
}
