import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { activityEvents } from "@thegamies/db";
import type { ActivityKind } from "@/lib/activity/kinds";
import { listTrendingBoard, TRENDING_PAGE_SIZE } from "@/lib/activity/query";
import {
  DEFAULT_TRENDING_KIND_WEIGHTS,
  DEFAULT_TRENDING_RECENCY_WEIGHTS,
  type TrendingWindowHours,
} from "@/lib/activity/trending";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();
const NOW = new Date();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
const sortIds = (...ids: string[]) => [...ids].sort();

/**
 * Community-scoped boards so other data in the test database never counts.
 * Default weights: recency 1 (≤24h) · 0.5 (≤72h) · 0.25 (≤7d) · 0.125 (older);
 * kinds playing 1.25, wishlist / backlog / beat / list_add 1, paused 0.
 *
 *   G1: M1 playing 2h (1.25) + M2 wishlist 30h (0.5)             = 1.75, 2 people
 *   G2: M3 wishlist 2h (1) + M4 backlog 30h (0.5) + M5 beat 100h (0.25) = 1.75, 3 people
 *   G3: M1 wishlist 2h (1)    G4: M2 list_add 2h (1)            → tie, id order
 *   G5: M4 wishlist 400h then playing 1h → latest only           = 1.25
 *       M3 paused 1h (weight 0) does not count
 *   Excluded: adult G6, private library entry G7, private person M7 on G8,
 *   hidden list G9, G10 older than 30 days.
 */
describe("trending board (integration)", () => {
  let seed: Seeder;
  let communityId: string;
  let pagingCommunityId: string;
  let g: Array<{ id: string; slug: string; title: string }>;
  let pagingGames: Array<{ id: string }>;

  beforeAll(async () => {
    seed = createSeeder(db);
    const community = await seed.community();
    communityId = community.id;
    const m: Array<{ id: string }> = [];
    for (let i = 0; i < 6; i++) {
      const person = await seed.profile();
      await seed.member(communityId, person.id);
      m.push(person);
    }
    const privatePerson = await seed.profile({ visibility: "private" });
    await seed.member(communityId, privatePerson.id);

    g = [];
    for (let i = 0; i < 10; i++) {
      g.push(await seed.game(i === 5 ? { isAdult: true } : {}));
    }
    const [g1, g2, g3, g4, g5, g6, g7, g8, g9, g10] = g;
    const hiddenList = await seed.list({ profileId: m[5].id, rankVisibility: "hidden" });

    const library = async (
      profileId: string,
      gameId: string,
      visibility: "public" | "private" = "public",
    ) => seed.libraryEntry({ profileId, gameId, status: "playing", visibility });
    await library(m[0].id, g1.id);
    await library(m[1].id, g1.id);
    await library(m[2].id, g2.id);
    await library(m[3].id, g2.id);
    await library(m[4].id, g2.id);
    await library(m[0].id, g3.id);
    await library(m[3].id, g5.id);
    await library(m[2].id, g5.id);
    await library(m[0].id, g6.id);
    await library(m[4].id, g7.id, "private");
    await library(privatePerson.id, g8.id);
    await library(m[0].id, g10.id);

    const event = (
      profileId: string,
      gameId: string,
      kind: ActivityKind,
      ageHours: number,
      listId: string | null = null,
    ) => ({
      profileId,
      gameId,
      kind,
      listId,
      batchId: randomUUID(),
      createdAt: hoursAgo(ageHours),
    });
    await db.insert(activityEvents).values([
      event(m[0].id, g1.id, "library_playing", 2),
      event(m[1].id, g1.id, "library_wishlist", 30),
      event(m[2].id, g2.id, "library_wishlist", 2),
      event(m[3].id, g2.id, "library_backlog", 30),
      event(m[4].id, g2.id, "library_beat", 100),
      event(m[0].id, g3.id, "library_wishlist", 2),
      event(m[1].id, g4.id, "list_add", 2),
      event(m[3].id, g5.id, "library_wishlist", 400),
      event(m[3].id, g5.id, "library_playing", 1),
      event(m[2].id, g5.id, "library_paused", 1),
      event(m[0].id, g6.id, "library_playing", 2),
      event(m[4].id, g7.id, "library_wishlist", 2),
      event(privatePerson.id, g8.id, "library_playing", 2),
      event(m[5].id, g9.id, "list_add", 2, hiddenList.id),
      event(m[0].id, g10.id, "library_playing", 800),
    ]);

    const paging = await seed.community();
    pagingCommunityId = paging.id;
    const pager = await seed.profile();
    await seed.member(pagingCommunityId, pager.id);
    pagingGames = await seed.games(TRENDING_PAGE_SIZE + 2);
    await db
      .insert(activityEvents)
      .values(pagingGames.map((game) => event(pager.id, game.id, "list_add", 3)));
  });

  afterAll(async () => {
    await seed?.cleanup();
  });

  function board(
    opts: {
      windowHours?: TrendingWindowHours;
      page?: number;
      applySiteFloor?: boolean;
      minPeople?: number;
      community?: string;
    } = {},
  ) {
    return listTrendingBoard({
      communityId: opts.community ?? communityId,
      windowHours: opts.windowHours ?? 24 * 30,
      page: opts.page,
      applySiteFloor: opts.applySiteFloor ?? false,
      minPeople: opts.minPeople,
      recencyWeights: DEFAULT_TRENDING_RECENCY_WEIGHTS,
      kindWeights: DEFAULT_TRENDING_KIND_WEIGHTS,
      now: NOW,
      db,
    });
  }

  it("orders by weighted score, then headcount, then game id", async () => {
    const [g1, g2, g3, g4, g5] = g;
    const result = await board();
    expect(result.rows.map((row) => row.gameId)).toEqual([
      g2.id,
      g1.id,
      g5.id,
      ...sortIds(g3.id, g4.id),
    ]);
    expect(result.rows[0]).toEqual({
      gameId: g2.id,
      slug: g2.slug,
      title: g2.title,
      coverUrl: null,
    });
    expect(result).toMatchObject({
      windowHours: 24 * 30,
      publicReady: true,
      distinctPeople: 5,
      total: 5,
      page: 1,
      totalPages: 1,
    });
  });

  it("counts only events inside the window", async () => {
    const [g1, g2, g3, g4, g5] = g;
    const result = await board({ windowHours: 24 });
    // G1: M1 playing 1.25 · G5: M4 playing 1.25 · G2, G3, G4: 1 each.
    expect(result.rows.map((row) => row.gameId)).toEqual([
      ...sortIds(g1.id, g5.id),
      ...sortIds(g2.id, g3.id, g4.id),
    ]);
    expect(result).toMatchObject({ distinctPeople: 4, total: 5 });
  });

  it("hides the board below the headcount floor", async () => {
    await expect(board({ applySiteFloor: true, minPeople: 6 })).resolves.toMatchObject({
      rows: [],
      publicReady: false,
      distinctPeople: 5,
      total: 0,
    });
    const ready = await board({ applySiteFloor: true, minPeople: 5 });
    expect(ready.publicReady).toBe(true);
    expect(ready.rows).toHaveLength(5);
  });

  it("pages in board order and clamps past the last page", async () => {
    const ids = sortIds(...pagingGames.map((game) => game.id));
    const first = await board({ community: pagingCommunityId, windowHours: 24 });
    expect(first).toMatchObject({ total: ids.length, page: 1, totalPages: 2, distinctPeople: 1 });
    expect(first.rows.map((row) => row.gameId)).toEqual(ids.slice(0, TRENDING_PAGE_SIZE));

    const second = await board({ community: pagingCommunityId, windowHours: 24, page: 2 });
    expect(second.rows.map((row) => row.gameId)).toEqual(ids.slice(TRENDING_PAGE_SIZE));

    const past = await board({ community: pagingCommunityId, windowHours: 24, page: 99 });
    expect(past).toMatchObject({ page: 2, totalPages: 2 });
    expect(past.rows.map((row) => row.gameId)).toEqual(ids.slice(TRENDING_PAGE_SIZE));
  });
});
