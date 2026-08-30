import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { createDb, profiles, type Db } from "@thegamies/db";
import {
  LAST_SITE_OPERATOR_MESSAGE,
  SITE_OPS_CLAIM_FAILED_MESSAGE,
  SITE_OPS_LIST_LIMIT,
  SITE_OPS_SEARCH_LIMIT,
} from "@/lib/site-ops/rules";

export type SiteOperatorRow = {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isSiteAdmin: boolean;
};

function getDb(): Db {
  return createDb();
}

const liveSiteAdmin = and(
  eq(profiles.isSiteAdmin, true),
  isNull(profiles.deletedAt),
);

export async function countSiteOperators(db: Db = getDb()): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .where(liveSiteAdmin);
  return Number(row?.n ?? 0);
}

export async function listSiteOperators(
  db: Db = getDb(),
): Promise<SiteOperatorRow[]> {
  const rows = await db
    .select({
      profileId: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isSiteAdmin: profiles.isSiteAdmin,
    })
    .from(profiles)
    .where(liveSiteAdmin)
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(SITE_OPS_LIST_LIMIT);

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isSiteAdmin: row.isSiteAdmin,
  }));
}

/**
 * SQL profile search for promoting site operators.
 * Blank query returns no hits — default list is current operators only.
 */
export async function searchProfilesForSiteOps(
  q: string,
  db: Db = getDb(),
): Promise<SiteOperatorRow[]> {
  const trimmed = q.trim();
  if (trimmed.length < 1) return [];

  const term = `%${trimmed}%`;
  const rows = await db
    .select({
      profileId: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      isSiteAdmin: profiles.isSiteAdmin,
    })
    .from(profiles)
    .where(
      and(
        isNull(profiles.deletedAt),
        or(ilike(profiles.displayName, term), ilike(profiles.username, term)),
      ),
    )
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(SITE_OPS_SEARCH_LIMIT);

  return rows.map((row) => ({
    profileId: row.profileId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isSiteAdmin: row.isSiteAdmin,
  }));
}

export async function setSiteOperator(input: {
  profileId: string;
  isSiteAdmin: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  if (input.isSiteAdmin) {
    const rows = await db
      .update(profiles)
      .set({ isSiteAdmin: true, updatedAt: new Date() })
      .where(and(eq(profiles.id, input.profileId), isNull(profiles.deletedAt)))
      .returning({ id: profiles.id });
    if (rows.length === 0) {
      return { error: "That person could not be made a site operator." };
    }
    return { ok: true };
  }

  const rows = await db
    .update(profiles)
    .set({ isSiteAdmin: false, updatedAt: new Date() })
    .where(
      and(
        eq(profiles.id, input.profileId),
        eq(profiles.isSiteAdmin, true),
        sql`(SELECT count(*)::int FROM profiles WHERE is_site_admin AND deleted_at IS NULL) > 1`,
      ),
    )
    .returning({ id: profiles.id });
  if (rows.length === 0) {
    return { error: LAST_SITE_OPERATOR_MESSAGE };
  }
  return { ok: true };
}

export async function claimFirstSiteAdmin(input: {
  profileId: string;
  secret: string;
}): Promise<{ ok: true } | { error: string }> {
  const expected = process.env.ADMIN_SYNC_SECRET;
  if (!expected || input.secret !== expected) {
    return { error: SITE_OPS_CLAIM_FAILED_MESSAGE };
  }

  const db = getDb();
  const rows = await db
    .update(profiles)
    .set({ isSiteAdmin: true, updatedAt: new Date() })
    .where(
      and(
        eq(profiles.id, input.profileId),
        isNull(profiles.deletedAt),
        sql`NOT EXISTS (SELECT 1 FROM profiles WHERE is_site_admin AND deleted_at IS NULL)`,
      ),
    )
    .returning({ id: profiles.id });
  if (rows.length === 0) {
    return { error: SITE_OPS_CLAIM_FAILED_MESSAGE };
  }
  return { ok: true };
}
