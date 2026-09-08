import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  createDb,
  profileFollows,
  profiles,
  type Db,
} from "@thegamies/db";
import { followDeniedReason } from "@/lib/follow/rules";
import { paginateProfileItems } from "@/lib/profile/profile-page";

export const FOLLOW_ROSTER_PAGE_SIZE = 24;

function getDb(): Db {
  return createDb();
}

export async function isFollowing(
  followerProfileId: string,
  followedProfileId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .select({ followerProfileId: profileFollows.followerProfileId })
    .from(profileFollows)
    .where(
      and(
        eq(profileFollows.followerProfileId, followerProfileId),
        eq(profileFollows.followedProfileId, followedProfileId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function followCounts(
  profileId: string,
  db: Db = getDb(),
): Promise<{ following: number; followers: number }> {
  const [followingRow] = await db
    .select({ n: count() })
    .from(profileFollows)
    .where(eq(profileFollows.followerProfileId, profileId));
  const [followersRow] = await db
    .select({ n: count() })
    .from(profileFollows)
    .where(eq(profileFollows.followedProfileId, profileId));
  return {
    following: Number(followingRow?.n ?? 0),
    followers: Number(followersRow?.n ?? 0),
  };
}

export async function followProfile(
  follower: {
    id: string;
    allowSeedFollow?: boolean;
  },
  target: {
    id: string;
    visibility: string;
    deletedAt: Date | null;
    isSeed: boolean;
  },
  db: Db = getDb(),
): Promise<{ error: string } | { ok: true }> {
  const denied = followDeniedReason(follower.id, target, {
    allowSeedFollow: follower.allowSeedFollow,
  });
  if (denied) return { error: denied };
  await db
    .insert(profileFollows)
    .values({
      followerProfileId: follower.id,
      followedProfileId: target.id,
    })
    .onConflictDoNothing();
  return { ok: true };
}

export async function unfollowProfile(
  followerProfileId: string,
  followedProfileId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .delete(profileFollows)
    .where(
      and(
        eq(profileFollows.followerProfileId, followerProfileId),
        eq(profileFollows.followedProfileId, followedProfileId),
      ),
    );
}

export type FollowRosterPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  visibility: string;
};

export async function listFollowingPage(
  profileId: string,
  pageRaw: number,
  opts: { includePrivate?: boolean } = {},
  db: Db = getDb(),
) {
  return listRosterPage(profileId, pageRaw, "following", opts, db);
}

export async function listFollowersPage(
  profileId: string,
  pageRaw: number,
  opts: { includePrivate?: boolean } = {},
  db: Db = getDb(),
) {
  return listRosterPage(profileId, pageRaw, "followers", opts, db);
}

async function listRosterPage(
  profileId: string,
  pageRaw: number,
  direction: "following" | "followers",
  opts: { includePrivate?: boolean },
  db: Db,
) {
  const pageSize = FOLLOW_ROSTER_PAGE_SIZE;
  const joinOn =
    direction === "following"
      ? eq(profiles.id, profileFollows.followedProfileId)
      : eq(profiles.id, profileFollows.followerProfileId);
  const visibilityFilter = opts.includePrivate
    ? isNull(profiles.deletedAt)
    : and(eq(profiles.visibility, "public"), isNull(profiles.deletedAt));
  const edgeFilter =
    direction === "following"
      ? eq(profileFollows.followerProfileId, profileId)
      : eq(profileFollows.followedProfileId, profileId);
  const where = and(edgeFilter, visibilityFilter);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profileFollows)
    .innerJoin(profiles, joinOn)
    .where(where);
  const total = Number(countRow?.n ?? 0);
  const { page, offset, totalPages } = paginateProfileItems(
    pageRaw,
    total,
    pageSize,
  );

  const rows = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      visibility: profiles.visibility,
    })
    .from(profileFollows)
    .innerJoin(profiles, joinOn)
    .where(where)
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(pageSize)
    .offset(offset);

  return {
    people: rows,
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function listFollowedProfileIds(
  followerProfileId: string,
  db: Db = getDb(),
): Promise<string[]> {
  const rows = await db
    .select({ id: profileFollows.followedProfileId })
    .from(profileFollows)
    .where(eq(profileFollows.followerProfileId, followerProfileId))
    .orderBy(desc(profileFollows.createdAt));
  return rows.map((row) => row.id);
}

export async function listFollowedAmong(
  followerProfileId: string,
  profileIds: string[],
  db: Db = getDb(),
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();
  const rows = await db
    .select({ id: profileFollows.followedProfileId })
    .from(profileFollows)
    .where(
      and(
        eq(profileFollows.followerProfileId, followerProfileId),
        inArray(profileFollows.followedProfileId, profileIds),
      ),
    );
  return new Set(rows.map((row) => row.id));
}
