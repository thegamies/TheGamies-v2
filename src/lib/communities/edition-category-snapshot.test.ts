import { describe, expect, it } from "vitest";
import { groupRankedCategoryRows } from "./edition-category-snapshot";

describe("groupRankedCategoryRows", () => {
  it("keeps totals and drops ranks past the podium", () => {
    const snapshot = groupRankedCategoryRows(
      [
        {
          mode: "community",
          categoryId: "gameplay",
          label: "Gameplay",
          description: null,
          sortOrder: 2,
          place: 1,
          gameId: "a",
          slug: "a",
          title: "A",
          subtitle: null,
          coverUrl: null,
          imageUrl: null,
          votes: 10,
          supportLinkUrl: null,
          isCommunity: false,
          answerType: null,
          total: 4,
          displayRank: 1,
        },
        {
          mode: "community",
          categoryId: "gameplay",
          label: "Gameplay",
          description: null,
          sortOrder: 2,
          place: 4,
          gameId: "d",
          slug: "d",
          title: "D",
          subtitle: null,
          coverUrl: null,
          imageUrl: null,
          votes: 1,
          supportLinkUrl: null,
          isCommunity: false,
          answerType: null,
          total: 4,
          displayRank: 4,
        },
        {
          mode: "voices",
          categoryId: "custom-1",
          label: "Mood",
          description: "house award",
          sortOrder: 1,
          place: 1,
          gameId: "entry-1",
          slug: "",
          title: "Quiet",
          subtitle: "Game",
          coverUrl: null,
          imageUrl: "https://cdn.example/mood.jpg",
          votes: 2,
          supportLinkUrl: "https://example.com",
          isCommunity: true,
          answerType: "text_only",
          total: 1,
          displayRank: 1,
        },
      ],
      3,
      "competition",
    );

    expect(snapshot.community.meta).toEqual([
      {
        categoryId: "gameplay",
        label: "Gameplay",
        description: null,
        sortOrder: 2,
        total: 4,
      },
    ]);
    expect(snapshot.community.podiums).toHaveLength(1);
    expect(snapshot.community.podiums[0]?.rows.map((row) => row.gameId)).toEqual([
      "a",
    ]);
    expect(snapshot.voices.meta[0]).toMatchObject({
      label: "Mood · Community",
      total: 1,
      isCommunity: true,
      tallyKind: "entry",
    });
    expect(snapshot.voices.podiums[0]?.rows[0]).toMatchObject({
      title: "Quiet — Game",
      coverUrl: "https://cdn.example/mood.jpg",
      supportLinkUrl: "https://example.com",
    });
  });
});