import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  communityEditionResultCategories,
  communityEditionResultCustomCategories,
  communityEditionResultGoty,
  communityEditionResultMeta,
  communityEditionResultVoters,
  communityEditionVoices,
} from "@thegamies/db";
import {
  ensureCustomCategoryFreezeComplete,
  ensureEditionResultsFrozen,
  rebuildEditionHostsResultsFrozen,
  rebuildEditionResultsFrozen,
} from "@/lib/communities/edition-results";
import { writeEditionFreezeSnapshot } from "@/lib/communities/edition-freeze-sql";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();

const COVER = (imageId: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;

/** Lowercase uuid strings sort like Postgres uuids (the last tie-break). */
const byId = <T extends { id: string }>(...rows: T[]) =>
  [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));

async function gotyRows(editionId: string, mode: string) {
  return db
    .select()
    .from(communityEditionResultGoty)
    .where(
      and(
        eq(communityEditionResultGoty.editionId, editionId),
        eq(communityEditionResultGoty.mode, mode),
      ),
    )
    .orderBy(asc(communityEditionResultGoty.place));
}

async function categoryRows(editionId: string, mode: string) {
  return db
    .select()
    .from(communityEditionResultCategories)
    .where(
      and(
        eq(communityEditionResultCategories.editionId, editionId),
        eq(communityEditionResultCategories.mode, mode),
      ),
    )
    .orderBy(
      asc(communityEditionResultCategories.categoryId),
      asc(communityEditionResultCategories.place),
    );
}

async function customRows(editionId: string, mode: string) {
  return db
    .select()
    .from(communityEditionResultCustomCategories)
    .where(
      and(
        eq(communityEditionResultCustomCategories.editionId, editionId),
        eq(communityEditionResultCustomCategories.mode, mode),
      ),
    )
    .orderBy(
      asc(communityEditionResultCustomCategories.categoryId),
      asc(communityEditionResultCustomCategories.place),
    );
}

async function voterRows(editionId: string) {
  return db
    .select()
    .from(communityEditionResultVoters)
    .where(eq(communityEditionResultVoters.editionId, editionId))
    .orderBy(asc(communityEditionResultVoters.profileId));
}

async function metaRow(editionId: string) {
  const [row] = await db
    .select()
    .from(communityEditionResultMeta)
    .where(eq(communityEditionResultMeta.editionId, editionId));
  return row;
}

async function snapshot(editionId: string) {
  return {
    goty: [...(await gotyRows(editionId, "community")), ...(await gotyRows(editionId, "voices"))],
    categories: [
      ...(await categoryRows(editionId, "community")),
      ...(await categoryRows(editionId, "voices")),
    ],
    custom: [
      ...(await customRows(editionId, "community")),
      ...(await customRows(editionId, "voices")),
    ],
    voters: await voterRows(editionId),
  };
}

type CustomRow = typeof communityEditionResultCustomCategories.$inferSelect;
type Game = Awaited<ReturnType<Seeder["game"]>>;
type Profile = Awaited<ReturnType<Seeder["profile"]>>;

/**
 * Six voters (P1, P2 are Hosts), games A–F. GOTY points = 11 − rank, ranks 1–10.
 *   P1: A#1 B#2 C#10    P2: B#1 A#2 D#9    P3: C#1 E#2 F#11 (F ignored)
 *   P4: D#1 C#10        P5: E#8            P6: no GOTY picks
 * Community: A 19 (1 first, 2 apps) = B 19 (1, 2) → id order; then
 *   C 12 (1, 3) > D 12 (1, 2) > E 12 (0, 2).
 * Hosts: A 19 = B 19 → id order; D 2 > C 1.
 */
describe("edition freeze (integration)", () => {
  let seed: Seeder;
  let community: { id: string };
  let edition: { id: string };
  let p: Profile[];
  let A: Game, B: Game, C: Game, D: Game, E: Game, F: Game;
  let catX: string, catY: string, catZ: string;
  let pickAward: { id: string; name: string; description: string; sortOrder: number };
  let gameAward: { id: string; name: string; description: string; sortOrder: number };
  let entryOne: { id: string; title: string };
  let entryTwo: { id: string; title: string };

  beforeAll(async () => {
    seed = createSeeder(db);
    community = await seed.community();
    edition = await seed.edition(community.id, 2026);
    p = [];
    for (let i = 0; i < 6; i++) p.push(await seed.profile());
    A = await seed.game({ coverImageId: "intcovera", year: 2026 });
    B = await seed.game({ year: 2026 });
    C = await seed.game({ year: 2025 });
    D = await seed.game();
    E = await seed.game();
    F = await seed.game();

    await seed.voice(edition.id, p[0].id);
    await seed.voice(edition.id, p[1].id);

    const ballots = [
      await seed.ballot({ editionId: edition.id, profileId: p[0].id, gameIds: [A.id, B.id, C.id], ranks: [1, 2, 10] }),
      await seed.ballot({ editionId: edition.id, profileId: p[1].id, gameIds: [B.id, A.id, D.id], ranks: [1, 2, 9] }),
      await seed.ballot({ editionId: edition.id, profileId: p[2].id, gameIds: [C.id, E.id, F.id], ranks: [1, 2, 11] }),
      await seed.ballot({ editionId: edition.id, profileId: p[3].id, gameIds: [D.id, C.id], ranks: [1, 10] }),
      await seed.ballot({ editionId: edition.id, profileId: p[4].id, gameIds: [E.id], ranks: [8] }),
      await seed.ballot({ editionId: edition.id, profileId: p[5].id }),
    ];

    catX = await seed.awardCategory("Int X");
    catY = await seed.awardCategory("Int Y");
    catZ = await seed.awardCategory("Int Z");
    await seed.enableCategory(edition.id, catX, 2);
    await seed.enableCategory(edition.id, catY, 1);
    // X: A 2, B 2 (id order), C 1. Hosts: A 1, B 1.
    await seed.categoryVote(ballots[0].id, catX, A.id);
    await seed.categoryVote(ballots[1].id, catX, B.id);
    await seed.categoryVote(ballots[2].id, catX, B.id);
    await seed.categoryVote(ballots[3].id, catX, A.id);
    await seed.categoryVote(ballots[4].id, catX, C.id);
    // Y: C 2, D 1. Hosts: C 1.
    await seed.categoryVote(ballots[0].id, catY, C.id);
    await seed.categoryVote(ballots[2].id, catY, C.id);
    await seed.categoryVote(ballots[5].id, catY, D.id);
    // Z is not enabled for the edition: never frozen.
    await seed.categoryVote(ballots[0].id, catZ, A.id);

    pickAward = await seed.customCategory(edition.id, { answerType: "selected_games", sortOrder: 1 });
    gameAward = await seed.customCategory(edition.id, { answerType: "any_game", sortOrder: 0 });
    entryOne = await seed.customEntry(pickAward.id, {
      title: "Entry One",
      gameId: A.id,
      imageUrl: "https://example.com/one.png",
      supportLinkUrl: "https://youtube.com/watch?v=1",
      supportLinkKind: "youtube",
    });
    entryTwo = await seed.customEntry(pickAward.id, { title: "Entry Two" });
    // Picks: One 2, Two 2 (entry id order). Hosts: One 1, Two 1.
    await seed.customVote({ ballotId: ballots[0].id, categoryId: pickAward.id, entryId: entryOne.id });
    await seed.customVote({ ballotId: ballots[1].id, categoryId: pickAward.id, entryId: entryTwo.id });
    await seed.customVote({ ballotId: ballots[2].id, categoryId: pickAward.id, entryId: entryTwo.id });
    await seed.customVote({ ballotId: ballots[3].id, categoryId: pickAward.id, entryId: entryOne.id });
    // Any game: D 2, E 1. Hosts: D 2.
    await seed.customVote({ ballotId: ballots[0].id, categoryId: gameAward.id, gameId: D.id });
    await seed.customVote({ ballotId: ballots[1].id, categoryId: gameAward.id, gameId: D.id });
    await seed.customVote({ ballotId: ballots[2].id, categoryId: gameAward.id, gameId: E.id });
  });

  afterAll(async () => {
    await seed?.cleanup();
  });

  const goty = (
    mode: string,
    place: number,
    game: Game,
    points: number,
    firstPlaceVotes: number,
    appearances: number,
  ) => ({
    editionId: edition.id,
    mode,
    place,
    gameId: game.id,
    slug: game.slug,
    title: game.title,
    gameYear: game.year,
    coverUrl: game.id === A.id ? COVER("intcovera") : null,
    points,
    firstPlaceVotes,
    appearances,
  });

  const cat = (mode: string, categoryId: string, place: number, game: Game, votes: number) => {
    const isX = categoryId === catX;
    return {
      editionId: edition.id,
      mode,
      categoryId,
      label: isX ? "Int X" : "Int Y",
      description: isX ? "Int X blurb" : "Int Y blurb",
      sortOrder: isX ? 2 : 1,
      place,
      gameId: game.id,
      slug: game.slug,
      title: game.title,
      coverUrl: game.id === A.id ? COVER("intcovera") : null,
      votes,
    };
  };

  const entryRow = (
    mode: string,
    place: number,
    entry: "one" | "two",
    votes: number,
  ): CustomRow => ({
    editionId: edition.id,
    mode,
    categoryId: pickAward.id,
    label: pickAward.name,
    description: pickAward.description,
    answerType: "selected_games",
    sortOrder: 1,
    place,
    entryId: entry === "one" ? entryOne.id : entryTwo.id,
    gameId: entry === "one" ? A.id : null,
    slug: entry === "one" ? A.slug : null,
    title: entry === "one" ? "Entry One" : "Entry Two",
    subtitle: entry === "one" ? A.title : null,
    imageUrl: entry === "one" ? "https://example.com/one.png" : null,
    coverUrl: entry === "one" ? COVER("intcovera") : null,
    supportLinkUrl: entry === "one" ? "https://youtube.com/watch?v=1" : null,
    supportLinkKind: entry === "one" ? "youtube" : null,
    votes,
  });

  const gameAwardRow = (mode: string, place: number, game: Game, votes: number): CustomRow => ({
    editionId: edition.id,
    mode,
    categoryId: gameAward.id,
    label: gameAward.name,
    description: gameAward.description,
    answerType: "any_game",
    sortOrder: 0,
    place,
    entryId: null,
    gameId: game.id,
    slug: game.slug,
    title: game.title,
    subtitle: null,
    imageUrl: null,
    coverUrl: null,
    supportLinkUrl: null,
    supportLinkKind: null,
    votes,
  });

  const entryOrder = () =>
    byId(
      { id: entryOne.id, key: "one" as const },
      { id: entryTwo.id, key: "two" as const },
    ).map((e) => e.key);

  function expectedCustom(mode: "community" | "voices") {
    const [first, second] = entryOrder();
    const entryVotes = mode === "community" ? 2 : 1;
    const picks = [
      entryRow(mode, 1, first, entryVotes),
      entryRow(mode, 2, second, entryVotes),
    ];
    const games =
      mode === "community"
        ? [gameAwardRow(mode, 1, D, 2), gameAwardRow(mode, 2, E, 1)]
        : [gameAwardRow(mode, 1, D, 2)];
    return [pickAward.id, gameAward.id].sort().flatMap((id) => (id === pickAward.id ? picks : games));
  }

  function expectedCategories(mode: "community" | "voices") {
    const [ab1, ab2] = byId(A, B);
    const x =
      mode === "community"
        ? [cat(mode, catX, 1, ab1, 2), cat(mode, catX, 2, ab2, 2), cat(mode, catX, 3, C, 1)]
        : [cat(mode, catX, 1, ab1, 1), cat(mode, catX, 2, ab2, 1)];
    const y =
      mode === "community"
        ? [cat(mode, catY, 1, C, 2), cat(mode, catY, 2, D, 1)]
        : [cat(mode, catY, 1, C, 1)];
    return [catX, catY].sort().flatMap((id) => (id === catX ? x : y));
  }

  it("freezes both boards with every tie-break, enabled categories only, awards and voters", async () => {
    const meta = await ensureEditionResultsFrozen(edition.id, db);
    expect(meta).toMatchObject({
      ballotCountCommunity: 6,
      ballotCountVoices: 2,
      gotyTotalCommunity: 5,
      gotyTotalVoices: 4,
    });

    const [ab1, ab2] = byId(A, B);
    const snap = await snapshot(edition.id);
    expect(snap.goty).toEqual([
      goty("community", 1, ab1, 19, 1, 2),
      goty("community", 2, ab2, 19, 1, 2),
      goty("community", 3, C, 12, 1, 3),
      goty("community", 4, D, 12, 1, 2),
      goty("community", 5, E, 12, 0, 2),
      goty("voices", 1, ab1, 19, 1, 2),
      goty("voices", 2, ab2, 19, 1, 2),
      goty("voices", 3, D, 2, 0, 1),
      goty("voices", 4, C, 1, 0, 1),
    ]);
    expect(snap.categories).toEqual([
      ...expectedCategories("community"),
      ...expectedCategories("voices"),
    ]);
    expect(snap.custom).toEqual([...expectedCustom("community"), ...expectedCustom("voices")]);
    expect(snap.voters).toEqual(
      byId(...p).map((person) => ({
        editionId: edition.id,
        profileId: person.id,
        isVoice: person.id === p[0].id || person.id === p[1].id,
        displayName: person.displayName,
        username: person.username,
      })),
    );
    expect(await metaRow(edition.id)).toMatchObject({
      ballotCountCommunity: 6,
      ballotCountVoices: 2,
      gotyTotalCommunity: 5,
      gotyTotalVoices: 4,
    });
  });

  it("leaves an existing freeze untouched", async () => {
    const before = await snapshot(edition.id);
    const metaBefore = await metaRow(edition.id);
    await expect(ensureEditionResultsFrozen(edition.id, db)).resolves.toMatchObject({
      frozenAt: metaBefore.frozenAt,
    });
    expect(await snapshot(edition.id)).toEqual(before);
  });

  it("backfills missing community-award rows once", async () => {
    const before = await snapshot(edition.id);
    await db
      .delete(communityEditionResultCustomCategories)
      .where(eq(communityEditionResultCustomCategories.editionId, edition.id));
    await ensureCustomCategoryFreezeComplete(edition.id, db);
    await ensureCustomCategoryFreezeComplete(edition.id, db);
    expect(await snapshot(edition.id)).toEqual(before);
  });

  it("rolls back the whole write when any statement fails", async () => {
    const before = await snapshot(edition.id);
    const metaBefore = await metaRow(edition.id);
    // Deletes run first; the meta insert then hits the existing row and fails.
    await expect(
      writeEditionFreezeSnapshot(edition.id, db, { replaceMeta: false }),
    ).rejects.toThrow();
    expect(await snapshot(edition.id)).toEqual(before);
    expect(await metaRow(edition.id)).toEqual(metaBefore);
  });

  it("rebuilds only the Hosts board when the Hosts roster changes", async () => {
    const before = await snapshot(edition.id);
    await db
      .delete(communityEditionVoices)
      .where(
        and(
          eq(communityEditionVoices.editionId, edition.id),
          eq(communityEditionVoices.profileId, p[1].id),
        ),
      );
    await seed.voice(edition.id, p[2].id);

    // Hosts P1 + P3: C 11 (1, 2) > A 10 (1, 1) > B 9 = E 9 (0, 1) → id order.
    await expect(rebuildEditionHostsResultsFrozen(edition.id, db)).resolves.toMatchObject({
      ballotCountCommunity: 6,
      ballotCountVoices: 2,
      gotyTotalCommunity: 5,
      gotyTotalVoices: 4,
    });
    const [be1, be2] = byId(B, E);
    expect(await gotyRows(edition.id, "voices")).toEqual([
      goty("voices", 1, C, 11, 1, 2),
      goty("voices", 2, A, 10, 1, 1),
      goty("voices", 3, be1, 9, 0, 1),
      goty("voices", 4, be2, 9, 0, 1),
    ]);
    // Hosts X: A 1 (P1), B 1 (P3) → id order. Y: C 2 (P1, P3).
    const [ab1, ab2] = byId(A, B);
    const voicesCats = [catX, catY]
      .sort()
      .flatMap((id) =>
        id === catX
          ? [cat("voices", catX, 1, ab1, 1), cat("voices", catX, 2, ab2, 1)]
          : [cat("voices", catY, 1, C, 2)],
      );
    expect(await categoryRows(edition.id, "voices")).toEqual(voicesCats);
    // Picks: One 1 (P1), Two 1 (P3) → entry id order. Any game: D 1 (P1), E 1 (P3) → id order.
    const [first, second] = entryOrder();
    const [de1, de2] = byId(D, E);
    const voicesCustom = [pickAward.id, gameAward.id]
      .sort()
      .flatMap((id) =>
        id === pickAward.id
          ? [entryRow("voices", 1, first, 1), entryRow("voices", 2, second, 1)]
          : [gameAwardRow("voices", 1, de1, 1), gameAwardRow("voices", 2, de2, 1)],
      );
    expect(await customRows(edition.id, "voices")).toEqual(voicesCustom);

    const after = await snapshot(edition.id);
    expect([
      ...(await gotyRows(edition.id, "community")),
    ]).toEqual(before.goty.filter((row) => row.mode === "community"));
    expect(await categoryRows(edition.id, "community")).toEqual(
      before.categories.filter((row) => row.mode === "community"),
    );
    expect(await customRows(edition.id, "community")).toEqual(
      before.custom.filter((row) => row.mode === "community"),
    );
    expect(after.voters.filter((v) => v.isVoice).map((v) => v.profileId).sort()).toEqual(
      [p[0].id, p[2].id].sort(),
    );
  });

  it("rebuilds the whole snapshot from current ballots", async () => {
    const metaBefore = await metaRow(edition.id);
    const meta = await rebuildEditionResultsFrozen(edition.id, db);
    expect(meta).toMatchObject({ ballotCountVoices: 2, gotyTotalVoices: 4 });
    const after = await metaRow(edition.id);
    expect(after.frozenAt.getTime()).toBeGreaterThanOrEqual(metaBefore.frozenAt.getTime());
    expect(await gotyRows(edition.id, "community")).toHaveLength(5);
    expect((await gotyRows(edition.id, "voices"))[0]).toMatchObject({ gameId: C.id, points: 11 });
  });

  it("settles concurrent first freezes on one snapshot", async () => {
    const other = await seed.edition(community.id, 2027);
    await seed.ballot({ editionId: other.id, profileId: p[0].id, gameIds: [A.id, B.id] });
    await seed.ballot({ editionId: other.id, profileId: p[1].id, gameIds: [B.id] });

    const results = await Promise.all([
      ensureEditionResultsFrozen(other.id, db),
      ensureEditionResultsFrozen(other.id, db),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({ ballotCountCommunity: 2, gotyTotalCommunity: 2 });
    }
    const rows = await gotyRows(other.id, "community");
    expect(rows.map((row) => [row.gameId, row.points])).toEqual([
      [B.id, 19],
      [A.id, 10],
    ]);
  });
});
