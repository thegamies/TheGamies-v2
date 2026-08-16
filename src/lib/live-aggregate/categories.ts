import { asc, eq, notInArray, sql } from "drizzle-orm";
import {
  awardCategories,
  covers,
  games,
  listCategoryVotes,
  type Db,
} from "@thegamies/db";
import { AWARD_CATEGORY_DEFS } from "./award-category-defs";
import { getLiveAggregateDb } from "./contrib";

export async function listActiveAwardCategories(
  db: Db = getLiveAggregateDb(),
) {
  return db
    .select({
      id: awardCategories.id,
      label: awardCategories.label,
      description: awardCategories.description,
      sortOrder: awardCategories.sortOrder,
      categoryGroup: awardCategories.categoryGroup,
      eligibility: awardCategories.eligibility,
      allowEditions: awardCategories.allowEditions,
    })
    .from(awardCategories)
    .where(eq(awardCategories.active, true))
    .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label));
}

/**
 * Upsert canonical `AWARD_CATEGORY_DEFS` into `award_categories` and deactivate
 * rows that are no longer in the catalog. Safe to call from admin seed / ops.
 */
export async function ensureAwardCategories(
  db: Db = getLiveAggregateDb(),
): Promise<{ upserted: number; active: number }> {
  const defs = AWARD_CATEGORY_DEFS;
  if (defs.length === 0) {
    return { upserted: 0, active: 0 };
  }

  await db
    .insert(awardCategories)
    .values(
      defs.map((def) => ({
        id: def.id,
        label: def.label,
        description: def.description,
        sortOrder: def.sortOrder,
        active: true,
        categoryGroup: def.group,
        eligibility: def.eligibility,
        allowEditions: def.allowEditions,
      })),
    )
    .onConflictDoUpdate({
      target: awardCategories.id,
      set: {
        label: sql`excluded.label`,
        description: sql`excluded.description`,
        sortOrder: sql`excluded.sort_order`,
        active: sql`excluded.active`,
        categoryGroup: sql`excluded.category_group`,
        eligibility: sql`excluded.eligibility`,
        allowEditions: sql`excluded.allow_editions`,
      },
    });

  const keepIds = defs.map((def) => def.id);
  await db
    .update(awardCategories)
    .set({ active: false })
    .where(notInArray(awardCategories.id, keepIds));

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
