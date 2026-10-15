import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listFollowingFeedPage, listTrendingBoard } from "@/lib/activity/query";
import {
  DEFAULT_TRENDING_KIND_WEIGHTS,
  DEFAULT_TRENDING_RECENCY_WEIGHTS,
} from "@/lib/activity/trending";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();

/**
 * Viewer follows A (public), P (private), D (deleted). Stranger S is not followed.
 * A: playing G1 (public), beat G2 (private entry), list_add G3 (hidden list), list_add G4.
 * P, D and S each play G1.
 */
describe("following feed and trending (integration)", () => {
  let seed: Seeder;
  let viewer: { id: string };
  let loner: { id: string };
  let personA: { id: string };
  let g1: { id: string };
  let g4: { id: string };

  beforeAll(async () => {
    seed = createSeeder(db);
    viewer = await seed.profile();
    loner = await seed.profile();
    personA = await seed.profile();
    const personP = await seed.profile({ visibility: "private" });
    const personD = await seed.profile({ deletedAt: new Date() });
    const stranger = await seed.profile();
    g1 = await seed.game();
    const g2 = await seed.game();
    const g3 = await seed.game();
    g4 = await seed.game();

    for (const followed of [personA, personP, personD]) {
      await seed.follow(viewer.id, followed.id);
    }
    await seed.follow(stranger.id, viewer.id);

    const hiddenList = await seed.list({
      profileId: personA.id,
      rankVisibility: "hidden",
      gameIds: [g3.id],
    });
    const publicList = await seed.list({ profileId: personA.id, gameIds: [g4.id] });

    await seed.libraryEntry({ profileId: personA.id, gameId: g1.id, status: "playing" });
    await seed.libraryEntry({
      profileId: personA.id,
      gameId: g2.id,
      status: "beat",
      visibility: "private",
    });
    for (const p of [personP, personD, stranger]) {
      await seed.libraryEntry({ profileId: p.id, gameId: g1.id, status: "playing" });
      await seed.activity({ profileId: p.id, kind: "library_playing", gameId: g1.id });
    }
    await seed.activity({ profileId: personA.id, kind: "library_playing", gameId: g1.id });
    await seed.activity({ profileId: personA.id, kind: "library_beat", gameId: g2.id });
    await seed.activity({
      profileId: personA.id,
      kind: "list_add",
      gameId: g3.id,
      listId: hiddenList.id,
    });
    await seed.activity({
      profileId: personA.id,
      kind: "list_add",
      gameId: g4.id,
      listId: publicList.id,
    });
  });

  afterAll(async () => {
    await seed?.cleanup();
  });

  function feedFor(profileId: string) {
    return listFollowingFeedPage(profileId, 1, db);
  }

  function trendingFor(profileId: string) {
    return listTrendingBoard({
      followerProfileId: profileId,
      applySiteFloor: false,
      recencyWeights: DEFAULT_TRENDING_RECENCY_WEIGHTS,
      kindWeights: DEFAULT_TRENDING_KIND_WEIGHTS,
      db,
    });
  }

  function feedGameIds(cards: Awaited<ReturnType<typeof feedFor>>["cards"]) {
    return cards
      .flatMap((card) =>
        card.sections.flatMap((section) =>
          section.type === "library" ? section.games : section.added,
        ),
      )
      .map((game) => game.gameId)
      .sort();
  }

  it("feed shows only visible activity from public, live people the viewer follows", async () => {
    const feed = await feedFor(viewer.id);
    expect(feed.cards.map((card) => card.profileId)).toEqual([personA.id]);
    expect(feedGameIds(feed.cards)).toEqual([g1.id, g4.id].sort());
    expect(feed.hasMore).toBe(false);
  });

  it("feed is empty for someone who follows nobody", async () => {
    await expect(feedFor(loner.id)).resolves.toMatchObject({ cards: [], hasMore: false });
  });

  it("trending counts only visible activity from followed public people", async () => {
    const board = await trendingFor(viewer.id);
    expect(board.rows.map((row) => row.gameId).sort()).toEqual([g1.id, g4.id].sort());
    expect(board.distinctPeople).toBe(1);
    expect(board.total).toBe(2);
  });

  it("trending is empty for someone who follows nobody", async () => {
    const board = await trendingFor(loner.id);
    expect(board.rows).toEqual([]);
    expect(board.total).toBe(0);
  });
});
