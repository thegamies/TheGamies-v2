import {
  and,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import {
  awardCategories,
  createDb,
  games,
  listCategoryVotes,
  listItems,
  lists,
  liveCategoryContrib,
  liveCategoryDirty,
  liveGotyContrib,
  liveGotyDirtyGames,
  liveGotyYearStats,
  type Db,
} from "@thegamies/db";
import { parseAwardCategoryEligibility } from "./award-category-defs";
import { categoryEligibilityError } from "./category-eligibility";
import {
  buildGotyContribRows,
  mergeDirtyCategoryKeys,
  mergeDirtyGotyKeys,
  type DirtyCategoryKey,
  type DirtyGotyKey,
} from "./scoring";

export function getLiveAggregateDb(): Db {
  return createDb();
}

export type SyncOwnedGotyResult = {
  dirtyGoty: DirtyGotyKey[];
  dirtyCategories: DirtyCategoryKey[];
  years: number[];
};

async function ensureYearStats(year: number, db: Db) {
  await db
    .insert(liveGotyYearStats)
    .values({ year })
    .onConflictDoNothing({ target: liveGotyYearStats.year });
}

async function bumpContribGeneration(years: number[], db: Db) {
  for (const year of years) {
    await ensureYearStats(year, db);
    await db
      .update(liveGotyYearStats)
      .set({
        contribGeneration: sql`${liveGotyYearStats.contribGeneration} + 1`,
      })
      .where(eq(liveGotyYearStats.year, year));
  }
}

async function markDirtyGoty(keys: DirtyGotyKey[], db: Db) {
  if (keys.length === 0) return;
  await db
    .insert(liveGotyDirtyGames)
    .values(keys.map((k) => ({ year: k.year, gameId: k.gameId })))
    .onConflictDoNothing();
}

async function markDirtyCategories(keys: DirtyCategoryKey[], db: Db) {
  if (keys.length === 0) return;
  await db
    .insert(liveCategoryDirty)
    .values(
      keys.map((k) => ({
        year: k.year,
        categoryId: k.categoryId,
        gameId: k.gameId,
      })),
    )
    .onConflictDoNothing();
}

/**
 * Replace scored contrib for an owned GOTY list from current list_items.
 * Marks dirty keys + bumps contribGeneration. Does NOT touch live_*_scores.
 */
export async function syncOwnedGotyContribFromList(
  listId: string,
  db: Db = getLiveAggregateDb(),
): Promise<SyncOwnedGotyResult | { error: string }> {
  const [list] = await db
    .select()
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);

  if (!list) return { error: "List not found." };
  if (list.listType !== "goty" || list.profileId == null || list.year == null) {
    return {
      dirtyGoty: [],
      dirtyCategories: [],
      years: [],
    };
  }

  const oldGoty = await db
    .select({
      year: liveGotyContrib.year,
      gameId: liveGotyContrib.gameId,
    })
    .from(liveGotyContrib)
    .where(eq(liveGotyContrib.listId, listId));

  const oldCats = await db
    .select({
      year: liveCategoryContrib.year,
      categoryId: liveCategoryContrib.categoryId,
      gameId: liveCategoryContrib.gameId,
    })
    .from(liveCategoryContrib)
    .where(eq(liveCategoryContrib.listId, listId));

  const itemRows = await db
    .select({
      gameId: listItems.gameId,
      rank: listItems.rank,
      isAdult: games.isAdult,
    })
    .from(listItems)
    .innerJoin(games, eq(games.id, listItems.gameId))
    .where(eq(listItems.listId, listId));

  const contribRows = buildGotyContribRows(itemRows);

  await db.delete(liveGotyContrib).where(eq(liveGotyContrib.listId, listId));
  if (contribRows.length > 0) {
    await db.insert(liveGotyContrib).values(
      contribRows.map((row) => ({
        listId,
        gameId: row.gameId,
        profileId: list.profileId!,
        year: list.year!,
        rank: row.rank,
        points: row.points,
      })),
    );
  }

  const voteRows = await db
    .select({
      categoryId: listCategoryVotes.categoryId,
      gameId: listCategoryVotes.gameId,
      year: games.year,
      firstReleaseDate: games.firstReleaseDate,
      versionParentIgdbId: games.versionParentIgdbId,
      isAdult: games.isAdult,
    })
    .from(listCategoryVotes)
    .innerJoin(games, eq(games.id, listCategoryVotes.gameId))
    .where(eq(listCategoryVotes.listId, listId));

  await db
    .delete(liveCategoryContrib)
    .where(eq(liveCategoryContrib.listId, listId));

  const voteCategoryIds = [...new Set(voteRows.map((v) => v.categoryId))];
  const voteCats =
    voteCategoryIds.length === 0
      ? []
      : await db
          .select({
            id: awardCategories.id,
            eligibility: awardCategories.eligibility,
            allowEditions: awardCategories.allowEditions,
          })
          .from(awardCategories)
          .where(inArray(awardCategories.id, voteCategoryIds));
  const voteCatById = new Map(voteCats.map((c) => [c.id, c]));

  const catContrib = voteRows.filter((v) => {
    const cat = voteCatById.get(v.categoryId);
    if (!cat) return false;
    return (
      categoryEligibilityError(
        {
          id: v.gameId,
          year: v.year,
          firstReleaseDate: v.firstReleaseDate,
          versionParentIgdbId: v.versionParentIgdbId,
          isAdult: v.isAdult,
        },
        list.year!,
        parseAwardCategoryEligibility(cat.eligibility),
        { allowEditions: cat.allowEditions },
      ) == null
    );
  });
  if (catContrib.length > 0) {
    await db.insert(liveCategoryContrib).values(
      catContrib.map((v) => ({
        listId,
        categoryId: v.categoryId,
        profileId: list.profileId!,
        year: list.year!,
        gameId: v.gameId,
      })),
    );
  }

  const newGoty = contribRows.map((r) => ({
    year: list.year!,
    gameId: r.gameId,
  }));
  const newCats = catContrib.map((v) => ({
    year: list.year!,
    categoryId: v.categoryId,
    gameId: v.gameId,
  }));

  const dirtyGoty = mergeDirtyGotyKeys(oldGoty, newGoty);
  const dirtyCategories = mergeDirtyCategoryKeys(oldCats, newCats);
  const years = [
    ...new Set([
      ...oldGoty.map((r) => r.year),
      ...newGoty.map((r) => r.year),
      ...oldCats.map((r) => r.year),
      ...newCats.map((r) => r.year),
      list.year,
    ]),
  ];

  await markDirtyGoty(dirtyGoty, db);
  await markDirtyCategories(dirtyCategories, db);
  await bumpContribGeneration(years, db);

  return { dirtyGoty, dirtyCategories, years };
}

/**
 * Clear contrib when a list is no longer an owned GOTY contributor
 * (e.g. year cleared, became custom, or lost profile).
 */
export async function clearOwnedGotyContrib(
  listId: string,
  db: Db = getLiveAggregateDb(),
): Promise<SyncOwnedGotyResult> {
  const oldGoty = await db
    .select({
      year: liveGotyContrib.year,
      gameId: liveGotyContrib.gameId,
    })
    .from(liveGotyContrib)
    .where(eq(liveGotyContrib.listId, listId));

  const oldCats = await db
    .select({
      year: liveCategoryContrib.year,
      categoryId: liveCategoryContrib.categoryId,
      gameId: liveCategoryContrib.gameId,
    })
    .from(liveCategoryContrib)
    .where(eq(liveCategoryContrib.listId, listId));

  await db.delete(liveGotyContrib).where(eq(liveGotyContrib.listId, listId));
  await db
    .delete(liveCategoryContrib)
    .where(eq(liveCategoryContrib.listId, listId));

  const dirtyGoty = mergeDirtyGotyKeys(oldGoty, []);
  const dirtyCategories = mergeDirtyCategoryKeys(oldCats, []);
  const years = [
    ...new Set([
      ...oldGoty.map((r) => r.year),
      ...oldCats.map((r) => r.year),
    ]),
  ];

  await markDirtyGoty(dirtyGoty, db);
  await markDirtyCategories(dirtyCategories, db);
  if (years.length > 0) await bumpContribGeneration(years, db);

  return { dirtyGoty, dirtyCategories, years };
}

export async function replaceCategoryVotesForList(
  listId: string,
  votes: { categoryId: string; gameId: string }[],
  db: Db = getLiveAggregateDb(),
): Promise<{ ok: true } | { error: string }> {
  const [list] = await db
    .select()
    .from(lists)
    .where(eq(lists.id, listId))
    .limit(1);
  if (!list) return { error: "List not found." };
  if (list.listType !== "goty" || !list.profileId || list.year == null) {
    return { error: "Category picks require an owned Game of the Year list." };
  }

  const year = list.year;

  if (votes.length > 0) {
    const categoryIds = [...new Set(votes.map((v) => v.categoryId))];
    const activeCats = await db
      .select({
        id: awardCategories.id,
        eligibility: awardCategories.eligibility,
        allowEditions: awardCategories.allowEditions,
      })
      .from(awardCategories)
      .where(
        and(
          inArray(awardCategories.id, categoryIds),
          eq(awardCategories.active, true),
        ),
      );
    if (activeCats.length !== categoryIds.length) {
      return { error: "One or more categories are not available." };
    }
    const catById = new Map(activeCats.map((c) => [c.id, c]));

    const gameIds = [...new Set(votes.map((v) => v.gameId))];
    const found = await db
      .select({
        id: games.id,
        year: games.year,
        firstReleaseDate: games.firstReleaseDate,
        versionParentIgdbId: games.versionParentIgdbId,
        isAdult: games.isAdult,
      })
      .from(games)
      .where(inArray(games.id, gameIds));
    if (found.length !== gameIds.length) {
      return { error: "One or more games could not be found." };
    }

    const byId = new Map(found.map((g) => [g.id, g]));
    for (const vote of votes) {
      const game = byId.get(vote.gameId);
      if (!game) {
        return { error: "One or more games could not be found." };
      }
      const cat = catById.get(vote.categoryId);
      if (!cat) {
        return { error: "One or more categories are not available." };
      }
      const err = categoryEligibilityError(
        game,
        year,
        parseAwardCategoryEligibility(cat.eligibility),
        { allowEditions: cat.allowEditions },
      );
      if (err) return { error: err };
    }
  }

  await db
    .delete(listCategoryVotes)
    .where(eq(listCategoryVotes.listId, listId));
  if (votes.length > 0) {
    await db.insert(listCategoryVotes).values(
      votes.map((v) => ({
        listId,
        categoryId: v.categoryId,
        gameId: v.gameId,
      })),
    );
  }

  await db
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, listId));

  return { ok: true };
}

export async function listYearsNeedingRefresh(
  db: Db = getLiveAggregateDb(),
): Promise<number[]> {
  const rows = await db
    .select({ year: liveGotyYearStats.year })
    .from(liveGotyYearStats)
    .where(
      sql`${liveGotyYearStats.contribGeneration} > ${liveGotyYearStats.scoresGeneration}`,
    );
  return rows.map((r) => r.year);
}
