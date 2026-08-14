import { describe, expect, it } from "vitest";
import {
  capEditionBallotItems,
  editionBallotDraftKey,
  saveEditionBallotCategoryVotesSchema,
  saveEditionBallotInputSchema,
  saveEditionBallotItemsSchema,
} from "./ballot-schema";
import {
  canSubmitEditionBallot,
  editionBallotWriteBlockedReason,
} from "./ballots";

describe("editionBallotWriteBlockedReason", () => {
  it("allows writes only while open", () => {
    expect(editionBallotWriteBlockedReason("open")).toBeNull();
    expect(editionBallotWriteBlockedReason("scheduled")).toMatch(/not opened/i);
    expect(editionBallotWriteBlockedReason("closed")).toMatch(/closed/i);
    expect(editionBallotWriteBlockedReason("published")).toMatch(/closed/i);
    expect(editionBallotWriteBlockedReason("draft")).toMatch(/not open/i);
  });
});

describe("canSubmitEditionBallot", () => {
  it("requires community membership", () => {
    expect(canSubmitEditionBallot(null)).toBe(false);
    expect(canSubmitEditionBallot("member")).toBe(true);
    expect(canSubmitEditionBallot("admin")).toBe(true);
  });
});

describe("saveEditionBallotItemsSchema", () => {
  it("accepts unique ranks and games", () => {
    expect(
      saveEditionBallotItemsSchema.safeParse([
        { gameId: "11111111-1111-4111-8111-111111111111", rank: 1 },
        { gameId: "22222222-2222-4222-8222-222222222222", rank: 2 },
      ]).success,
    ).toBe(true);
  });

  it("rejects more than 10 games or ranks above 10", () => {
    const tooMany = saveEditionBallotItemsSchema.safeParse(
      Array.from({ length: 11 }, (_, i) => ({
        gameId: `11111111-1111-4111-8111-${(i + 1).toString(16).padStart(12, "0")}`,
        rank: i + 1,
      })),
    );
    expect(tooMany.success).toBe(false);

    const rankEleven = saveEditionBallotItemsSchema.safeParse([
      { gameId: "11111111-1111-4111-8111-111111111111", rank: 11 },
    ]);
    expect(rankEleven.success).toBe(false);
  });
});

describe("capEditionBallotItems", () => {
  it("keeps rank order and slices to 10", () => {
    const capped = capEditionBallotItems(
      Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        rank: 12 - i,
      })),
    );
    expect(capped).toHaveLength(10);
    expect(capped.map((item) => item.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => String(12 - i)),
    );
    expect(capped.map((item) => item.rank)).toEqual(
      Array.from({ length: 10 }, (_, i) => i + 1),
    );
  });
});

describe("editionBallotDraftKey", () => {
  it("ignores category vote order", () => {
    const items = [
      { gameId: "11111111-1111-4111-8111-111111111111", rank: 1, blurb: " " },
    ];
    const a = editionBallotDraftKey({
      items,
      categoryVotes: [
        { categoryId: "b", gameId: "22222222-2222-4222-8222-222222222222" },
        { categoryId: "a", gameId: "33333333-3333-4333-8333-333333333333" },
      ],
    });
    const b = editionBallotDraftKey({
      items,
      categoryVotes: [
        { categoryId: "a", gameId: "33333333-3333-4333-8333-333333333333" },
        { categoryId: "b", gameId: "22222222-2222-4222-8222-222222222222" },
      ],
    });
    expect(a).toBe(b);
  });

  it("treats trimmed blurbs as equal", () => {
    const votes: Array<{ categoryId: string; gameId: string }> = [];
    expect(
      editionBallotDraftKey({
        items: [
          { gameId: "11111111-1111-4111-8111-111111111111", rank: 1, blurb: "  hi" },
        ],
        categoryVotes: votes,
      }),
    ).toBe(
      editionBallotDraftKey({
        items: [
          { gameId: "11111111-1111-4111-8111-111111111111", rank: 1, blurb: "hi" },
        ],
        categoryVotes: votes,
      }),
    );
  });
});

describe("saveEditionBallotCategoryVotesSchema", () => {
  it("enforces one game per category", () => {
    expect(
      saveEditionBallotCategoryVotesSchema.safeParse([
        {
          categoryId: "best-multiplayer",
          gameId: "11111111-1111-4111-8111-111111111111",
        },
      ]).success,
    ).toBe(true);
    expect(
      saveEditionBallotCategoryVotesSchema.safeParse([
        {
          categoryId: "best-multiplayer",
          gameId: "11111111-1111-4111-8111-111111111111",
        },
        {
          categoryId: "best-multiplayer",
          gameId: "22222222-2222-4222-8222-222222222222",
        },
      ]).success,
    ).toBe(false);
  });
});

describe("saveEditionBallotInputSchema", () => {
  it("parses a full ballot payload", () => {
    const parsed = saveEditionBallotInputSchema.safeParse({
      slug: "kinda_funny",
      year: "2026",
      items: [
        { gameId: "11111111-1111-4111-8111-111111111111", rank: 1 },
      ],
      categoryVotes: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.year).toBe(2026);
      expect(parsed.data.slug).toBe("kinda_funny");
    }
  });
});
