import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyLibraryStatusCounts } from "@/lib/activity/kinds";
import { countFollowsLibraryForGame } from "@/lib/activity/query";
import {
  followCounts,
  listFollowedAmong,
  listFollowedProfileIds,
  listFollowingPage,
} from "@/lib/follow/service";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();

/**
 * Viewer follows: two public people, one private, one deleted.
 * A stranger (not followed) also has the game in their library.
 */
describe("follow graph (integration)", () => {
  let seed: Seeder;
  let viewer: { id: string };
  let publicA: { id: string };
  let publicB: { id: string };
  let privateC: { id: string };
  let deletedD: { id: string };
  let stranger: { id: string };
  let game: { id: string };

  beforeAll(async () => {
    seed = createSeeder(db);
    viewer = await seed.profile();
    publicA = await seed.profile();
    publicB = await seed.profile();
    privateC = await seed.profile({ visibility: "private" });
    deletedD = await seed.profile({ deletedAt: new Date() });
    stranger = await seed.profile();
    game = await seed.game();

    const t = Date.UTC(2026, 0, 1);
    await seed.follow(viewer.id, publicA.id, new Date(t + 1_000));
    await seed.follow(viewer.id, publicB.id, new Date(t + 2_000));
    await seed.follow(viewer.id, privateC.id, new Date(t + 3_000));
    await seed.follow(viewer.id, deletedD.id, new Date(t + 4_000));
    await seed.follow(stranger.id, viewer.id);

    await seed.libraryEntry({ profileId: publicA.id, gameId: game.id, status: "playing" });
    await seed.libraryEntry({
      profileId: publicB.id,
      gameId: game.id,
      status: "beat",
      visibility: "private",
    });
    await seed.libraryEntry({ profileId: privateC.id, gameId: game.id, status: "playing" });
    await seed.libraryEntry({ profileId: deletedD.id, gameId: game.id, status: "backlog" });
    await seed.libraryEntry({ profileId: stranger.id, gameId: game.id, status: "playing" });
  });

  afterAll(async () => {
    await seed?.cleanup();
  });

  it("lists followed ids newest first, including private and deleted edges", async () => {
    await expect(listFollowedProfileIds(viewer.id, db)).resolves.toEqual([
      deletedD.id,
      privateC.id,
      publicB.id,
      publicA.id,
    ]);
  });

  it("counts only public library entries of public, live, followed people", async () => {
    const followedIds = await listFollowedProfileIds(viewer.id, db);
    await expect(countFollowsLibraryForGame(game.id, followedIds, db)).resolves.toEqual({
      ...emptyLibraryStatusCounts(),
      playing: 1,
    });
  });

  it("returns empty counts when the viewer follows nobody", async () => {
    const followedIds = await listFollowedProfileIds(stranger.id, db);
    expect(followedIds).toEqual([viewer.id]);
    await expect(countFollowsLibraryForGame(game.id, [], db)).resolves.toEqual(
      emptyLibraryStatusCounts(),
    );
  });

  it("intersects a candidate set with the viewer's follows", async () => {
    const among = await listFollowedAmong(
      viewer.id,
      [publicA.id, stranger.id, privateC.id],
      db,
    );
    expect([...among].sort()).toEqual([publicA.id, privateC.id].sort());
  });

  it("counts edges and pages the public roster", async () => {
    await expect(followCounts(viewer.id, db)).resolves.toEqual({
      following: 4,
      followers: 1,
    });
    const page = await listFollowingPage(viewer.id, 1, {}, db);
    expect(page.total).toBe(2);
    expect(page.people.map((p) => p.id).sort()).toEqual(
      [publicA.id, publicB.id].sort(),
    );
  });
});
