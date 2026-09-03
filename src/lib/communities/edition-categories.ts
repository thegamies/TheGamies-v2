import { and, asc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import {
  awardCategories,
  communityEditionBallotCategoryVotes,
  communityEditionBallots,
  communityEditionCategories,
  communityEditions,
  createDb,
  type Db,
} from "@thegamies/db";
import {
  ensureAwardCategories,
  listActiveAwardCategories,
} from "@/lib/live-aggregate/categories";
import { computeEditionStatus, type EditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";

function getDb(): Db {
  return createDb();
}

export type EditionAwardCategoryOption = {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  /** Always true for enabled-list helpers; kept for form compatibility. */
  enabled: boolean;
};

/** Hosts may add/remove categories only before voting closes. */
export function editionCategoriesWriteBlockedReason(
  status: EditionStatus,
): string | null {
  if (status === "closed" || status === "published") {
    return "Categories can only be changed before voting closes.";
  }
  return null;
}

/**
 * Ops / QA helper: attach every active site category to an edition.
 * Product create can attach a subset on `/create/event`; hosts may also add later.
 */
export async function seedEditionCategories(
  editionId: string,
  db: Db = getDb(),
): Promise<void> {
  await ensureAwardCategories(db);
  const active = await listActiveAwardCategories(db);
  if (active.length === 0) return;
  await db
    .insert(communityEditionCategories)
    .values(
      active.map((c) => ({
        editionId,
        categoryId: c.id,
        sortOrder: c.sortOrder,
      })),
    )
    .onConflictDoNothing();
}

/** Ops seed: replace the edition ballot with an explicit category set. */
export async function replaceEditionCategoriesForSeed(
  editionId: string,
  categoryIds: readonly string[],
  db: Db = getDb(),
): Promise<void> {
  await ensureAwardCategories(db);
  const previousIds = await listEditionEnabledCategoryIds(editionId, db);
  const next = [...new Set(categoryIds.filter(Boolean))];
  const nextSet = new Set(next);
  const removedIds = previousIds.filter((id) => !nextSet.has(id));

  await db
    .delete(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, editionId));
  if (next.length > 0) {
    await db.insert(communityEditionCategories).values(
      next.map((categoryId, index) => ({
        editionId,
        categoryId,
        sortOrder: index + 1,
      })),
    );
  }
  if (removedIds.length > 0) {
    await purgeEditionBallotCategoryVotes(editionId, removedIds, db);
  }
}

/**
 * Categories on the ballot / freeze for this edition.
 * Empty when the host has not added any (no site-catalog fallback).
 */
export async function listEditionAwardCategories(
  editionId: string,
  db: Db = getDb(),
): Promise<
  Array<{
    id: string;
    label: string;
    description: string | null;
    sortOrder: number;
    categoryGroup: string;
    eligibility: string;
    allowEditions: boolean;
  }>
> {
  const rows = await db
    .select({
      id: awardCategories.id,
      label: awardCategories.label,
      description: awardCategories.description,
      sortOrder: communityEditionCategories.sortOrder,
      categoryGroup: awardCategories.categoryGroup,
      eligibility: awardCategories.eligibility,
      allowEditions: awardCategories.allowEditions,
    })
    .from(communityEditionCategories)
    .innerJoin(
      awardCategories,
      eq(awardCategories.id, communityEditionCategories.categoryId),
    )
    .where(eq(communityEditionCategories.editionId, editionId))
    .orderBy(
      asc(communityEditionCategories.sortOrder),
      asc(awardCategories.label),
    );

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    sortOrder: r.sortOrder,
    categoryGroup: r.categoryGroup,
    eligibility: r.eligibility,
    allowEditions: r.allowEditions,
  }));
}

/** Lightweight id list for join filters / purge diffs. */
export async function listEditionEnabledCategoryIds(
  editionId: string,
  db: Db = getDb(),
): Promise<string[]> {
  const rows = await db
    .select({ id: communityEditionCategories.categoryId })
    .from(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, editionId));
  return rows.map((r) => r.id);
}

/**
 * Drop ballot picks for awards no longer on this event.
 * Used when hosts remove categories while voting is still open.
 */
export async function purgeEditionBallotCategoryVotes(
  editionId: string,
  categoryIds: string[],
  db: Db = getDb(),
): Promise<number> {
  const unique = [
    ...new Set(categoryIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];
  if (unique.length === 0) return 0;

  const ballots = await db
    .select({ id: communityEditionBallots.id })
    .from(communityEditionBallots)
    .where(eq(communityEditionBallots.editionId, editionId));
  if (ballots.length === 0) return 0;

  const deleted = await db
    .delete(communityEditionBallotCategoryVotes)
    .where(
      and(
        inArray(
          communityEditionBallotCategoryVotes.ballotId,
          ballots.map((b) => b.id),
        ),
        inArray(communityEditionBallotCategoryVotes.categoryId, unique),
      ),
    )
    .returning({
      ballotId: communityEditionBallotCategoryVotes.ballotId,
    });

  return deleted.length;
}

/** Keep freeze/result rows that are still on the event settings list. */
export function filterRowsByEnabledCategoryIds<
  T extends { categoryId: string },
>(rows: readonly T[], enabledIds: ReadonlySet<string>): T[] {
  if (enabledIds.size === 0) return [];
  return rows.filter((row) => enabledIds.has(row.categoryId));
}

/** Host settings: only categories enabled for this edition (read-only join). */
export async function listEditionCategorySettings(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionAwardCategoryOption[]> {
  const rows = await listEditionAwardCategories(editionId, db);
  return rows.map((r) => ({
    ...r,
    enabled: true,
  }));
}

export async function searchSiteAwardCategories(
  opts: {
    q: string;
    excludeIds?: string[];
    limit?: number;
  },
  db?: Db,
): Promise<
  Array<{ id: string; label: string; description: string | null }>
> {
  const q = opts.q.trim();
  if (q.length < 1) return [];
  const database = db ?? getDb();
  const limit = Math.min(30, Math.max(1, opts.limit ?? 20));
  const exclude = (opts.excludeIds ?? []).filter(Boolean);

  const term = `%${q}%`;
  const conditions = [
    eq(awardCategories.active, true),
    or(ilike(awardCategories.label, term), ilike(awardCategories.id, term))!,
  ];
  if (exclude.length > 0) {
    conditions.push(notInArray(awardCategories.id, exclude));
  }

  let rows = await database
    .select({
      id: awardCategories.id,
      label: awardCategories.label,
      description: awardCategories.description,
    })
    .from(awardCategories)
    .where(and(...conditions))
    .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label))
    .limit(limit);

  // Rare: empty catalog — upsert defs once, then retry the same query.
  if (rows.length === 0) {
    const [{ count }] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(awardCategories)
      .where(eq(awardCategories.active, true));
    if (Number(count) === 0) {
      await ensureAwardCategories(database);
      rows = await database
        .select({
          id: awardCategories.id,
          label: awardCategories.label,
          description: awardCategories.description,
        })
        .from(awardCategories)
        .where(and(...conditions))
        .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label))
        .limit(limit);
    }
  }

  return rows;
}

async function requireEditableEdition(
  slug: string,
  profileId: string,
  yearRaw: unknown,
  db: Db,
) {
  const yearNum = Number(yearRaw);
  if (!Number.isFinite(yearNum) || yearNum < 1970 || yearNum > 2100) {
    return { ok: false as const, error: "Invalid year." };
  }
  const year = Math.floor(yearNum);

  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { ok: false as const, error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return {
      ok: false as const,
      error: "Only hosts can edit event categories.",
    };
  }

  const edition = await getEditionByCommunityYear(detail.id, year, db);
  if (!edition) return { ok: false as const, error: "Event not found." };

  const status = computeEditionStatus(edition);
  const blocked = editionCategoriesWriteBlockedReason(status);
  if (blocked) {
    return { ok: false as const, error: blocked };
  }

  return { ok: true as const, edition, year, detail };
}

export async function addEditionCategory(
  slug: string,
  profileId: string,
  input: { year: unknown; categoryId: string },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const gate = await requireEditableEdition(slug, profileId, input.year, db);
  if (!gate.ok) return { error: gate.error };

  const categoryId = input.categoryId.trim();
  if (!categoryId) return { error: "Choose a category." };

  const [siteCat] = await db
    .select({
      id: awardCategories.id,
      sortOrder: awardCategories.sortOrder,
    })
    .from(awardCategories)
    .where(
      and(eq(awardCategories.id, categoryId), eq(awardCategories.active, true)),
    )
    .limit(1);
  if (!siteCat) return { error: "That category was not found." };

  await db
    .insert(communityEditionCategories)
    .values({
      editionId: gate.edition.id,
      categoryId,
      sortOrder: siteCat.sortOrder,
    })
    .onConflictDoNothing();

  await db
    .update(communityEditions)
    .set({ updatedAt: new Date() })
    .where(eq(communityEditions.id, gate.edition.id));

  return { ok: true };
}

export async function removeEditionCategory(
  slug: string,
  profileId: string,
  input: { year: unknown; categoryId: string },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const gate = await requireEditableEdition(slug, profileId, input.year, db);
  if (!gate.ok) return { error: gate.error };

  const categoryId = input.categoryId.trim();
  if (!categoryId) return { error: "Choose a category." };

  await db
    .delete(communityEditionCategories)
    .where(
      and(
        eq(communityEditionCategories.editionId, gate.edition.id),
        eq(communityEditionCategories.categoryId, categoryId),
      ),
    );

  await purgeEditionBallotCategoryVotes(gate.edition.id, [categoryId], db);

  await db
    .update(communityEditions)
    .set({ updatedAt: new Date() })
    .where(eq(communityEditions.id, gate.edition.id));

  return { ok: true };
}

/** Replace the edition’s enabled category set (used by unified Edition settings Save). */
export async function setCommunityEditionCategories(
  slug: string,
  profileId: string,
  input: { year: unknown; categoryIds: string[] },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const gate = await requireEditableEdition(slug, profileId, input.year, db);
  if (!gate.ok) return { error: gate.error };

  let active = await listActiveAwardCategories(db);
  if (active.length === 0) {
    await ensureAwardCategories(db);
    active = await listActiveAwardCategories(db);
  }
  const activeIds = new Set(active.map((c) => c.id));
  const unique = [
    ...new Set(
      input.categoryIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && activeIds.has(id)),
    ),
  ];

  const sortById = new Map(active.map((c) => [c.id, c.sortOrder] as const));
  unique.sort(
    (a, b) =>
      (sortById.get(a) ?? 0) - (sortById.get(b) ?? 0) || a.localeCompare(b),
  );

  const previousIds = await listEditionEnabledCategoryIds(gate.edition.id, db);
  const nextIds = new Set(unique);
  const removedIds = previousIds.filter((id) => !nextIds.has(id));

  await db
    .delete(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, gate.edition.id));
  if (unique.length > 0) {
    await db.insert(communityEditionCategories).values(
      unique.map((categoryId, index) => ({
        editionId: gate.edition.id,
        categoryId,
        sortOrder: index + 1,
      })),
    );
  }

  if (removedIds.length > 0) {
    await purgeEditionBallotCategoryVotes(gate.edition.id, removedIds, db);
  }

  await db
    .update(communityEditions)
    .set({ updatedAt: new Date() })
    .where(eq(communityEditions.id, gate.edition.id));

  return { ok: true };
}
