import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  awardCategories,
  liveCategoryContrib,
  liveCategoryDirty,
  liveCategoryScores,
  liveGotyContrib,
  liveGotyDirtyGames,
  liveGotyScores,
  liveGotyYearStats,
} from "@thegamies/db";
import { rebuildYear, tryRefreshYear } from "@/lib/live-aggregate/refresh";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();

/** Far-future year so real standings are never touched. */
const YEAR = 3000 + (randomBytes(2).readUInt16BE(0) % 6000);

async function gotyScores() {
  return db
    .select()
    .from(liveGotyScores)
    .where(eq(liveGotyScores.year, YEAR))
    .orderBy(asc(liveGotyScores.gameId));
}

async function categoryScores(categoryId: string) {
  return db
    .select()
    .from(liveCategoryScores)
    .where(
      and(eq(liveCategoryScores.year, YEAR), eq(liveCategoryScores.categoryId, categoryId)),
    )
    .orderBy(asc(liveCategoryScores.gameId));
}

async function stats() {
  const [row] = await db
    .select()
    .from(liveGotyYearStats)
    .where(eq(liveGotyYearStats.year, YEAR));
  return row;
}

async function dirtyCounts() {
  const goty = await db
    .select()
    .from(liveGotyDirtyGames)
    .where(eq(liveGotyDirtyGames.year, YEAR));
  const cats = await db
    .select()
    .from(liveCategoryDirty)
    .where(eq(liveCategoryDirty.year, YEAR));
  return { goty: goty.length, categories: cats.length };
}

/**
 * Three GOTY lists for YEAR:
 *   list1: g1 #1 (10pts), g2 #2 (9pts)
 *   list2: g3 #1 (10pts), g1 #2 (9pts)
 *   list3: g2 #1 (10pts)
 * g4 has a stale score and no contrib (must be removed).
 * Category votes: list1 → g1, list2 → g1, list3 → g2; g4 has a stale vote count.
 */
describe("live GOTY dirty-key refresh (integration)", () => {
  let seed: Seeder;
  const categoryId = `int-cat-${randomBytes(4).toString("hex")}`;
  let g: Array<{ id: string }>;

  beforeAll(async () => {
    seed = createSeeder(db);
    await db
      .insert(awardCategories)
      .values({ id: categoryId, label: "Integration category", active: false });

    const people = [await seed.profile(), await seed.profile(), await seed.profile()];
    g = [await seed.game(), await seed.game(), await seed.game(), await seed.game()];
    const [g1, g2, g3, g4] = g;
    const lists = [];
    for (const person of people) {
      lists.push(await seed.list({ profileId: person.id, listType: "goty", year: YEAR }));
    }

    await db.insert(liveGotyContrib).values([
      { listId: lists[0].id, profileId: people[0].id, year: YEAR, gameId: g1.id, rank: 1, points: 10 },
      { listId: lists[0].id, profileId: people[0].id, year: YEAR, gameId: g2.id, rank: 2, points: 9 },
      { listId: lists[1].id, profileId: people[1].id, year: YEAR, gameId: g3.id, rank: 1, points: 10 },
      { listId: lists[1].id, profileId: people[1].id, year: YEAR, gameId: g1.id, rank: 2, points: 9 },
      { listId: lists[2].id, profileId: people[2].id, year: YEAR, gameId: g2.id, rank: 1, points: 10 },
    ]);
    await db.insert(liveCategoryContrib).values([
      { listId: lists[0].id, profileId: people[0].id, year: YEAR, categoryId, gameId: g1.id },
      { listId: lists[1].id, profileId: people[1].id, year: YEAR, categoryId, gameId: g1.id },
      { listId: lists[2].id, profileId: people[2].id, year: YEAR, categoryId, gameId: g2.id },
    ]);

    await db.insert(liveGotyScores).values({ year: YEAR, gameId: g4.id, score: 7, listMentions: 1 });
    await db
      .insert(liveCategoryScores)
      .values({ year: YEAR, categoryId, gameId: g4.id, voteCount: 3 });

    await db.insert(liveGotyYearStats).values({ year: YEAR, contribGeneration: 1 });
    await db
      .insert(liveGotyDirtyGames)
      .values(g.map((game) => ({ year: YEAR, gameId: game.id })));
    await db.insert(liveCategoryDirty).values([
      { year: YEAR, categoryId, gameId: g1.id },
      { year: YEAR, categoryId, gameId: g2.id },
      { year: YEAR, categoryId, gameId: g4.id },
    ]);
  });

  afterAll(async () => {
    await db.delete(liveGotyScores).where(eq(liveGotyScores.year, YEAR));
    await db.delete(liveCategoryScores).where(eq(liveCategoryScores.year, YEAR));
    await db.delete(liveGotyDirtyGames).where(eq(liveGotyDirtyGames.year, YEAR));
    await db.delete(liveCategoryDirty).where(eq(liveCategoryDirty.year, YEAR));
    await db.delete(liveGotyYearStats).where(eq(liveGotyYearStats.year, YEAR));
    await seed?.cleanup();
    await db.delete(awardCategories).where(eq(awardCategories.id, categoryId));
  });

  it("refreshes dirty keys in small batches, then matches a full rebuild", async () => {
    const before = await stats();
    await expect(tryRefreshYear(YEAR, db, { batchSize: 1 })).resolves.toEqual({
      refreshed: true,
    });

    const [g1, g2, g3, g4] = g;
    const scores = await gotyScores();
    const byGame = new Map(scores.map((row) => [row.gameId, row]));
    expect(byGame.has(g4.id)).toBe(false);
    expect(byGame.get(g1.id)).toMatchObject({
      score: 19,
      listMentions: 2,
      rank1Count: 1,
      rank2Count: 1,
    });
    expect(byGame.get(g2.id)).toMatchObject({ score: 19, listMentions: 2 });
    expect(byGame.get(g3.id)).toMatchObject({ score: 10, listMentions: 1, rank1Count: 1 });

    const cats = await categoryScores(categoryId);
    expect(cats.map((row) => [row.gameId, row.voteCount])).toEqual(
      [
        [g1.id, 2],
        [g2.id, 1],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );

    await expect(dirtyCounts()).resolves.toEqual({ goty: 0, categories: 0 });
    const after = await stats();
    expect(after.scoresGeneration).toBe(1);
    expect(after.listCount).toBe(3);
    expect(after.standingsVersion).toBe(before.standingsVersion + 1);
    expect(after.refreshing).toBe(false);

    await rebuildYear(YEAR, db);
    await expect(gotyScores()).resolves.toEqual(scores);
    await expect(categoryScores(categoryId)).resolves.toEqual(cats);
  });

  it("picks up keys marked dirty after a refresh on the next one", async () => {
    const [, , g3] = g;
    await db
      .update(liveGotyContrib)
      .set({ points: 4, rank: 7 })
      .where(and(eq(liveGotyContrib.year, YEAR), eq(liveGotyContrib.gameId, g3.id)));
    await db.insert(liveGotyDirtyGames).values({ year: YEAR, gameId: g3.id });
    await db
      .update(liveGotyYearStats)
      .set({ contribGeneration: 2 })
      .where(eq(liveGotyYearStats.year, YEAR));

    await expect(tryRefreshYear(YEAR, db)).resolves.toEqual({ refreshed: true });
    const row = (await gotyScores()).find((s) => s.gameId === g3.id);
    expect(row).toMatchObject({ score: 4, rank1Count: 0, rank7Count: 1 });
    expect((await stats()).scoresGeneration).toBe(2);
  });

  it("full rebuild drops stale scores, clears dirty marks and catches up generations", async () => {
    const [g1, , , g4] = g;
    const expectedGoty = await gotyScores();
    const expectedCats = await categoryScores(categoryId);
    await db.insert(liveGotyScores).values({ year: YEAR, gameId: g4.id, score: 5, listMentions: 1 });
    await db
      .update(liveGotyScores)
      .set({ score: 1 })
      .where(and(eq(liveGotyScores.year, YEAR), eq(liveGotyScores.gameId, g1.id)));
    await db
      .insert(liveCategoryScores)
      .values({ year: YEAR, categoryId, gameId: g4.id, voteCount: 9 });
    await db.insert(liveGotyDirtyGames).values({ year: YEAR, gameId: g4.id });
    await db.insert(liveCategoryDirty).values({ year: YEAR, categoryId, gameId: g4.id });
    await db
      .update(liveGotyYearStats)
      .set({ contribGeneration: 3 })
      .where(eq(liveGotyYearStats.year, YEAR));
    const before = await stats();

    await rebuildYear(YEAR, db);

    await expect(gotyScores()).resolves.toEqual(expectedGoty);
    await expect(categoryScores(categoryId)).resolves.toEqual(expectedCats);
    await expect(dirtyCounts()).resolves.toEqual({ goty: 0, categories: 0 });
    const after = await stats();
    expect(after.scoresGeneration).toBe(3);
    expect(after.standingsVersion).toBe(before.standingsVersion + 1);
    expect(after.refreshing).toBe(false);
  });

  it("reports already current when nothing changed", async () => {
    await expect(tryRefreshYear(YEAR, db)).resolves.toEqual({
      refreshed: true,
      reason: "already_current",
    });
  });
});
