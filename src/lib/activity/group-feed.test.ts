import { describe, expect, it } from "vitest";
import { groupFeedEvents, type FeedEventRow } from "./group-feed";

function row(
  partial: Partial<FeedEventRow> & Pick<FeedEventRow, "id" | "kind" | "batchId">,
): FeedEventRow {
  return {
    profileId: "p1",
    displayName: "Ada",
    username: "ada",
    avatarUrl: null,
    createdAt: new Date("2026-09-07T12:00:00.000Z"),
    gameId: "g1",
    gameSlug: "game-one",
    gameTitle: "Game One",
    coverUrl: null,
    listId: null,
    listSlug: null,
    listTitle: null,
    listYear: null,
    ...partial,
  };
}

describe("groupFeedEvents", () => {
  it("groups the same GOTY batch into one card with added and removed", () => {
    const cards = groupFeedEvents([
      row({
        id: "1",
        kind: "list_add",
        batchId: "b1",
        listId: "l1",
        listSlug: "goty-2026",
        listTitle: "2026 GOTY",
        listYear: 2026,
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
      }),
      row({
        id: "2",
        kind: "list_remove",
        batchId: "b1",
        listId: "l1",
        listSlug: "goty-2026",
        listTitle: "2026 GOTY",
        listYear: 2026,
        gameId: "g1",
      }),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.sections).toHaveLength(1);
    const section = cards[0]?.sections[0];
    expect(section?.type).toBe("list");
    if (section?.type !== "list") return;
    expect(section.added.map((g) => g.gameId)).toEqual(["g2"]);
    expect(section.removed.map((g) => g.gameId)).toEqual(["g1"]);
  });

  it("groups one person's library kinds for a UTC day into one card", () => {
    const cards = groupFeedEvents([
      row({
        id: "1",
        kind: "library_backlog",
        batchId: "a",
        createdAt: new Date("2026-09-07T12:00:00.000Z"),
      }),
      row({
        id: "2",
        kind: "library_backlog",
        batchId: "b",
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
        createdAt: new Date("2026-09-07T12:20:00.000Z"),
      }),
      row({
        id: "3",
        kind: "library_playing",
        batchId: "c",
        createdAt: new Date("2026-09-07T12:10:00.000Z"),
      }),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.createdAt.toISOString()).toBe("2026-09-07T12:20:00.000Z");
    expect(cards[0]?.sections.map((s) => s.type === "library" && s.kind)).toEqual(
      ["library_backlog", "library_playing"],
    );
  });

  it("does not group across UTC days", () => {
    const cards = groupFeedEvents([
      row({
        id: "1",
        kind: "library_beat",
        batchId: "a",
        createdAt: new Date("2026-09-07T00:20:00.000Z"),
      }),
      row({
        id: "2",
        kind: "library_beat",
        batchId: "b",
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
        createdAt: new Date("2026-09-06T23:50:00.000Z"),
      }),
    ]);
    expect(cards).toHaveLength(2);
  });

  it("sorts person-day cards by each person's latest event", () => {
    const cards = groupFeedEvents([
      row({
        id: "ada-old",
        kind: "library_wishlist",
        batchId: "a",
        createdAt: new Date("2026-09-07T10:00:00.000Z"),
      }),
      row({
        id: "bob",
        profileId: "p2",
        displayName: "Bob",
        username: "bob",
        kind: "library_playing",
        batchId: "b",
        createdAt: new Date("2026-09-07T15:00:00.000Z"),
      }),
      row({
        id: "ada-new",
        kind: "library_beat",
        batchId: "c",
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
        createdAt: new Date("2026-09-07T16:00:00.000Z"),
      }),
    ]);
    expect(cards.map((c) => c.username)).toEqual(["ada", "bob"]);
    expect(cards[0]?.createdAt.toISOString()).toBe("2026-09-07T16:00:00.000Z");
  });

  it("mixes library and list events for the same person-day", () => {
    const cards = groupFeedEvents([
      row({
        id: "1",
        kind: "library_playing",
        batchId: "a",
      }),
      row({
        id: "2",
        kind: "list_add",
        batchId: "b",
        listId: "l1",
        listSlug: "goty-2026",
        listTitle: "2026 GOTY",
        listYear: 2026,
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
        createdAt: new Date("2026-09-07T13:00:00.000Z"),
      }),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.sections.map((s) => s.type)).toEqual(["list", "library"]);
  });

  it("keeps each game's time and newest-first order on a mixed day", () => {
    const cards = groupFeedEvents([
      row({
        id: "1",
        kind: "library_playing",
        batchId: "a",
        createdAt: new Date("2026-09-07T12:10:00.000Z"),
      }),
      row({
        id: "2",
        kind: "library_beat",
        batchId: "b",
        gameId: "g2",
        gameSlug: "two",
        gameTitle: "Two",
        createdAt: new Date("2026-09-07T16:00:00.000Z"),
      }),
    ]);
    const playing = cards[0]?.sections.find(
      (s) => s.type === "library" && s.kind === "library_playing",
    );
    const beat = cards[0]?.sections.find(
      (s) => s.type === "library" && s.kind === "library_beat",
    );
    expect(playing?.type === "library" && playing.games[0]?.createdAt.toISOString()).toBe(
      "2026-09-07T12:10:00.000Z",
    );
    expect(beat?.type === "library" && beat.games[0]?.kind).toBe("library_beat");
  });
});
