import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  awardCategories,
  liveCategoryContrib,
  liveGotyContrib,
} from "@thegamies/db";
import {
  clearCommunityLiveLockSnapshots,
  getCommunityLiveStandings,
} from "@/lib/communities/live";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();
const YEAR = 3000 + (randomBytes(2).readUInt16BE(0) % 6000);

/**
 * One community, four members, one category for YEAR:
 * gA gets 2 votes, gB and gC 1 each (tied second). A non-member votes gD.
 */
describe("community live category detail (integration)", () => {
  let seed: Seeder;
  let communityId: string;
  const categoryId = `int-cat-${randomBytes(4).toString("hex")}`;
  let gA: { id: string };
  let gB: { id: string };
  let gC: { id: string };

  beforeAll(async () => {
    seed = createSeeder(db);
    await db.insert(awardCategories).values({
      id: categoryId,
      label: "Integration category",
      categoryGroup: "premier",
    });
    const community = await seed.community({ liveRankingsEnabled: true });
    communityId = community.id;
    gA = await seed.game();
    gB = await seed.game();
    gC = await seed.game();
    const gD = await seed.game();

    const votes = [gA, gA, gB, gC];
    for (const [i, game] of votes.entries()) {
      const person = await seed.profile();
      await seed.member(communityId, person.id);
      const list = await seed.list({ profileId: person.id, listType: "goty", year: YEAR });
      await db.insert(liveCategoryContrib).values({
        listId: list.id,
        profileId: person.id,
        year: YEAR,
        categoryId,
        gameId: game.id,
      });
      // GOTY tie: first two members each rank a different game #1 (10 points).
      if (i < 2) {
        await db.insert(liveGotyContrib).values({
          listId: list.id,
          profileId: person.id,
          year: YEAR,
          gameId: i === 0 ? gA.id : gB.id,
          rank: 1,
          points: 10,
        });
      }
    }
    const outsider = await seed.profile();
    const outsiderList = await seed.list({ profileId: outsider.id, listType: "goty", year: YEAR });
    await db.insert(liveCategoryContrib).values({
      listId: outsiderList.id,
      profileId: outsider.id,
      year: YEAR,
      categoryId,
      gameId: gD.id,
    });
  });

  afterAll(async () => {
    if (communityId) await clearCommunityLiveLockSnapshots(communityId, db);
    await seed?.cleanup();
    await db.delete(awardCategories).where(eq(awardCategories.id, categoryId));
  });

  function detail(page: number, locked: boolean) {
    return getCommunityLiveStandings(
      communityId,
      YEAR,
      {
        view: "category",
        categoryId,
        categoryGroup: "all",
        page,
        pageSize: 2,
        locked,
        scoresVisibleFrom: new Date(0),
      },
      db,
    );
  }

  it("locks a board with tied GOTY scores and tied category votes", async () => {
    const board = await getCommunityLiveStandings(
      communityId,
      YEAR,
      { view: "goty", locked: true, scoresVisibleFrom: new Date(0) },
      db,
    );
    expect(board.goty.map((r) => [r.gameId, r.place, r.score])).toEqual(
      [gA.id, gB.id].sort().map((id) => [id, 1, 10]),
    );
  });

  for (const locked of [false, true]) {
    const mode = locked ? "locked" : "unlocked";

    it(`${mode}: pages the category by its own game count`, async () => {
      const first = await detail(1, locked);
      expect(first.categories).toHaveLength(1);
      const block = first.categories[0];
      expect(block.categoryId).toBe(categoryId);
      expect(block.totalVotes).toBe(4);
      expect(first.categoryGameTotal).toBe(3);
      expect(first.totalPages).toBe(2);
      expect(first.page).toBe(1);
      expect(block.rows.map((r) => [r.gameId, r.place, r.voteCount])).toEqual([
        [gA.id, 1, 2],
        [[gB.id, gC.id].sort()[0], 2, 1],
      ]);

      const second = await detail(2, locked);
      expect(second.page).toBe(2);
      expect(second.categoryGameTotal).toBe(3);
      expect(second.categories[0].rows.map((r) => [r.gameId, r.place, r.voteCount])).toEqual([
        [[gB.id, gC.id].sort()[1], 2, 1],
      ]);
    });
  }
});
