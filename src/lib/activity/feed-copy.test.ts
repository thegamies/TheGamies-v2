import { describe, expect, it } from "vitest";
import { feedCardHeadline, feedGameAction } from "./feed-copy";
import type { FeedCard, FeedCardGame } from "./group-feed";

const at = new Date("2026-09-07T12:00:00.000Z");

function game(partial: Partial<FeedCardGame> = {}): FeedCardGame {
  return {
    gameId: "g1",
    slug: "one",
    title: "One",
    coverUrl: null,
    kind: "library_playing",
    createdAt: at,
    ...partial,
  };
}

const base: Omit<FeedCard, "sections"> = {
  key: "p1:2026-09-07",
  profileId: "p1",
  displayName: "Ada",
  username: "ada",
  avatarUrl: null,
  createdAt: at,
};

describe("feedCardHeadline", () => {
  it("keeps specific copy for a single library kind", () => {
    expect(
      feedCardHeadline({
        ...base,
        sections: [
          {
            type: "library",
            kind: "library_playing",
            games: [game()],
          },
        ],
      }),
    ).toBe("Ada is playing");
  });

  it("summarizes a mixed library day", () => {
    expect(
      feedCardHeadline({
        ...base,
        sections: [
          {
            type: "library",
            kind: "library_playing",
            games: [game()],
          },
          {
            type: "library",
            kind: "library_backlog",
            games: [game({ gameId: "g2", slug: "two", title: "Two", kind: "library_backlog" })],
          },
        ],
      }),
    ).toBe("Ada updated their library");
  });

  it("summarizes library mixed with a list", () => {
    expect(
      feedCardHeadline({
        ...base,
        sections: [
          {
            type: "library",
            kind: "library_playing",
            games: [game()],
          },
          {
            type: "list",
            listSlug: "goty-2026",
            listTitle: "2026 GOTY",
            listYear: 2026,
            added: [
              game({
                gameId: "g2",
                slug: "two",
                title: "Two",
                kind: "list_add",
              }),
            ],
            removed: [],
            revealed: false,
          },
        ],
      }),
    ).toBe("Ada updated their games");
  });
});

describe("feedGameAction", () => {
  it("names started playing and beat", () => {
    expect(feedGameAction("library_playing")).toBe("Started playing");
    expect(feedGameAction("library_beat")).toBe("Beat");
  });
});
