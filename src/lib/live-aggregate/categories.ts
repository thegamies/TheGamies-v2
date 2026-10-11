import { asc, eq, sql } from "drizzle-orm";
import {
  awardCategories,
  covers,
  games,
  listCategoryVotes,
  type Db,
} from "@thegamies/db";
import { AWARD_CATEGORY_DEFS } from "./award-category-defs";
import { getLiveAggregateDb } from "./contrib";

const awardCategorySelect = {
  id: awardCategories.id,
  label: awardCategories.label,
  description: awardCategories.description,
  sortOrder: awardCategories.sortOrder,
  categoryGroup: awardCategories.categoryGroup,
  eligibility: awardCategories.eligibility,
  allowEditions: awardCategories.allowEditions,
  allowDlcAddon: awardCategories.allowDlcAddon,
  currentOrPreviousYear: awardCategories.currentOrPreviousYear,
} as const;

export async function listActiveAwardCategories(
  db: Db = getLiveAggregateDb(),
) {
  return db
    .select({
      id: awardCategorySelect.id,
      label: awardCategorySelect.label,
      description: awardCategorySelect.description,
      sortOrder: awardCategorySelect.sortOrder,
      categoryGroup: awardCategorySelect.categoryGroup,
      eligibility: awardCategorySelect.eligibility,
      allowEditions: awardCategorySelect.allowEditions,
      allowDlcAddon: awardCategorySelect.allowDlcAddon,
      currentOrPreviousYear: awardCategorySelect.currentOrPreviousYear,
    })
    .from(awardCategories)
    .where(eq(awardCategories.active, true))
    .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label));
}

/**
 * Insert the bootstrap catalog when `award_categories` is empty.
 * Does not overwrite admin edits or deactivate extra rows.
 */
export async function ensureAwardCategories(
  db: Db = getLiveAggregateDb(),
): Promise<{ upserted: number; active: number }> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(awardCategories);
  if (Number(count) > 0) {
    const active = await listActiveAwardCategories(db);
    return { upserted: 0, active: active.length };
  }

  const defs = AWARD_CATEGORY_DEFS;
  if (defs.length === 0) {
    return { upserted: 0, active: 0 };
  }

  await db.insert(awardCategories).values(
    defs.map((def) => ({
      id: def.id,
      label: def.label,
      description: def.description,
      sortOrder: def.sortOrder,
      active: true,
      categoryGroup: def.group,
      eligibility: def.eligibility,
      allowEditions: def.allowEditions,
      allowDlcAddon: def.allowDlcAddon,
      currentOrPreviousYear: def.currentOrPreviousYear,
    })),
  );

  const active = await listActiveAwardCategories(db);
  return { upserted: defs.length, active: active.length };
}

export async function getCategoryVotesForList(
  listId: string,
  db: Db = getLiveAggregateDb(),
) {
  const rows = await db
    .select({
      categoryId: listCategoryVotes.categoryId,
      gameId: listCategoryVotes.gameId,
      title: games.title,
      coverImageId: covers.imageId,
    })
    .from(listCategoryVotes)
    .innerJoin(games, eq(games.id, listCategoryVotes.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(eq(listCategoryVotes.listId, listId));

  return rows.map((row) => ({
    categoryId: row.categoryId,
    gameId: row.gameId,
    title: row.title,
    coverUrl: row.coverImageId
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${row.coverImageId}.jpg`
      : null,
  }));
}
