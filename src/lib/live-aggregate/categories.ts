import { asc, eq } from "drizzle-orm";
import {
  awardCategories,
  covers,
  games,
  listCategoryVotes,
  type Db,
} from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";

export async function listActiveAwardCategories(
  db: Db = getLiveAggregateDb(),
) {
  return db
    .select({
      id: awardCategories.id,
      label: awardCategories.label,
      description: awardCategories.description,
    })
    .from(awardCategories)
    .where(eq(awardCategories.active, true))
    .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label));
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
