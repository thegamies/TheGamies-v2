import { describe, expect, it } from "vitest";
import {
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

  it("rejects duplicate games or ranks", () => {
    const dupGame = saveEditionBallotItemsSchema.safeParse([
      { gameId: "11111111-1111-4111-8111-111111111111", rank: 1 },
      { gameId: "11111111-1111-4111-8111-111111111111", rank: 2 },
    ]);
    expect(dupGame.success).toBe(false);
    const dupRank = saveEditionBallotItemsSchema.safeParse([
      { gameId: "11111111-1111-4111-8111-111111111111", rank: 1 },
      { gameId: "22222222-2222-4222-8222-222222222222", rank: 1 },
    ]);
    expect(dupRank.success).toBe(false);
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
