import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  communityBans,
  communityDeletionRequests,
  communityEditionBallots,
  communityEditions,
  communityEditionVoices,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import { shouldKeepEditionBallot } from "@/lib/profile/delete-account";
import {
  banCommunityMemberBlockedReason,
  canManageCommunity,
  COMMUNITY_BANS_PAGE_SIZE,
  communityDeletionRequestConfirmMatches,
  removeCommunityMemberBlockedReason,
  unbanCommunityMemberBlockedReason,
} from "./rules";
import type { CommunityRole } from "./schema";
import { getCommunityBySlug } from "./service";

function getDb(): Db {
  return createDb(process.env.DATABASE_URL ?? "");
}

function asRole(role: string): CommunityRole {
  return role === "admin" ? "admin" : "member";
}

/**
 * Drop this profile's unpublished edition ballots/voices in one community.
 * Closed/published ceremonies keep ballot rows.
 */
export async function dropUnpublishedEditionRowsForCommunityMember(
  communityId: string,
  profileId: string,
  db: Db = getDb(),
): Promise<void> {
  const editions = await db
    .select({
      id: communityEditions.id,
      opensAt: communityEditions.opensAt,
      closesAt: communityEditions.closesAt,
      publishesAt: communityEditions.publishesAt,
    })
    .from(communityEditions)
    .where(eq(communityEditions.communityId, communityId));

  const dropIds = editions
    .filter((edition) => !shouldKeepEditionBallot(computeEditionStatus(edition)))
    .map((edition) => edition.id);
  if (dropIds.length === 0) return;

  await db
    .delete(communityEditionBallots)
    .where(
      and(
        eq(communityEditionBallots.profileId, profileId),
        inArray(communityEditionBallots.editionId, dropIds),
      ),
    );
  await db
    .delete(communityEditionVoices)
    .where(
      and(
        eq(communityEditionVoices.profileId, profileId),
        inArray(communityEditionVoices.editionId, dropIds),
      ),
    );
}

export async function removeCommunityMember(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
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

  const blocked = removeCommunityMemberBlockedReason({
    actorCanManage: canManageCommunity(detail.viewerRole),
    actorProfileId,
    targetProfileId,
    targetIsMember: Boolean(target),
    targetRole: target ? asRole(target.role) : "member",
    hostCount: detail.hostCount,
  });
  if (blocked) return { error: blocked };
  if (!target) return { error: "That person is not a member." };

  const { retireCommunityHostInCommunity } = await import("./community-hosts");
  await retireCommunityHostInCommunity(
    detail.id,
    targetProfileId,
    actorProfileId,
    db,
  );
  await dropUnpublishedEditionRowsForCommunityMember(
    detail.id,
    targetProfileId,
    db,
  );
  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
      ),
    );
  return { ok: true };
}

export async function banCommunityMember(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
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

  const [existingBan] = await db
    .select({ profileId: communityBans.profileId })
    .from(communityBans)
    .where(
      and(
        eq(communityBans.communityId, detail.id),
        eq(communityBans.profileId, targetProfileId),
      ),
    )
    .limit(1);

  const blocked = banCommunityMemberBlockedReason({
    actorCanManage: canManageCommunity(detail.viewerRole),
    actorProfileId,
    targetProfileId,
    targetIsMember: Boolean(target),
    targetRole: target ? asRole(target.role) : "member",
    hostCount: detail.hostCount,
    alreadyBanned: Boolean(existingBan),
  });
  if (blocked) return { error: blocked };
  if (!target) return { error: "That person is not a member." };

  const { retireCommunityHostInCommunity } = await import("./community-hosts");
  await retireCommunityHostInCommunity(
    detail.id,
    targetProfileId,
    actorProfileId,
    db,
  );
  await dropUnpublishedEditionRowsForCommunityMember(
    detail.id,
    targetProfileId,
    db,
  );
  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
      ),
    );
  await db.insert(communityBans).values({
    communityId: detail.id,
    profileId: targetProfileId,
    bannedByProfileId: actorProfileId,
  });
  return { ok: true };
}

export async function unbanCommunityMember(
  slug: string,
  actorProfileId: string,
  targetProfileId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };

  const [existingBan] = await db
    .select({ profileId: communityBans.profileId })
    .from(communityBans)
    .where(
      and(
        eq(communityBans.communityId, detail.id),
        eq(communityBans.profileId, targetProfileId),
      ),
    )
    .limit(1);

  const blocked = unbanCommunityMemberBlockedReason({
    actorCanManage: canManageCommunity(detail.viewerRole),
    isBanned: Boolean(existingBan),
  });
  if (blocked) return { error: blocked };

  await db
    .delete(communityBans)
    .where(
      and(
        eq(communityBans.communityId, detail.id),
        eq(communityBans.profileId, targetProfileId),
      ),
    );
  return { ok: true };
}

export type CommunityBanRow = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannedAt: Date;
};

export type CommunityBansPage = {
  bans: CommunityBanRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listCommunityBansPage(
  communityId: string,
  pageRaw: number,
  opts: { q?: string; db?: Db } = {},
): Promise<CommunityBansPage> {
  const db = opts.db ?? getDb();
  const q = opts.q?.trim() ?? "";
  const search =
    q.length > 0
      ? or(
          ilike(profiles.displayName, `%${q}%`),
          ilike(profiles.username, `%${q}%`),
        )
      : undefined;
  const where = search
    ? and(eq(communityBans.communityId, communityId), search)
    : eq(communityBans.communityId, communityId);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityBans)
    .innerJoin(profiles, eq(profiles.id, communityBans.profileId))
    .where(where);
  const total = Number(countRow?.n ?? 0);
  const pageSize = COMMUNITY_BANS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(pageRaw) || 1), totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      profileId: communityBans.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      bannedAt: communityBans.bannedAt,
    })
    .from(communityBans)
    .innerJoin(profiles, eq(profiles.id, communityBans.profileId))
    .where(where)
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(pageSize)
    .offset(offset);

  return { bans: rows, page, pageSize, total, totalPages };
}

export async function isProfileBannedFromCommunity(
  communityId: string,
  profileId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .select({ profileId: communityBans.profileId })
    .from(communityBans)
    .where(
      and(
        eq(communityBans.communityId, communityId),
        eq(communityBans.profileId, profileId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function requestCommunityDeletion(
  slug: string,
  actorProfileId: string,
  confirmName: string,
  db: Db = getDb(),
): Promise<{ ok: true; alreadyPending?: boolean } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only admins can request deletion." };
  }
  if (!communityDeletionRequestConfirmMatches(detail.name, confirmName)) {
    return { error: "Type the community name to confirm." };
  }

  const [existing] = await db
    .select({ id: communityDeletionRequests.id })
    .from(communityDeletionRequests)
    .where(
      and(
        eq(communityDeletionRequests.communityId, detail.id),
        eq(communityDeletionRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: true, alreadyPending: true };
  }

  try {
    await db.insert(communityDeletionRequests).values({
      communityId: detail.id,
      requestedByProfileId: actorProfileId,
      status: "pending",
    });
  } catch {
    const [again] = await db
      .select({ id: communityDeletionRequests.id })
      .from(communityDeletionRequests)
      .where(
        and(
          eq(communityDeletionRequests.communityId, detail.id),
          eq(communityDeletionRequests.status, "pending"),
        ),
      )
      .limit(1);
    if (again) return { ok: true, alreadyPending: true };
    return { error: "Could not submit the deletion request." };
  }

  return { ok: true };
}

export async function getPendingCommunityDeletionRequest(
  communityId: string,
  db: Db = getDb(),
): Promise<{ id: string; requestedAt: Date } | null> {
  const [row] = await db
    .select({
      id: communityDeletionRequests.id,
      requestedAt: communityDeletionRequests.requestedAt,
    })
    .from(communityDeletionRequests)
    .where(
      and(
        eq(communityDeletionRequests.communityId, communityId),
        eq(communityDeletionRequests.status, "pending"),
      ),
    )
    .limit(1);
  return row ?? null;
}
