import { describe, expect, it } from "vitest";
import {
  filterCategoryVotesToEnabled,
  saveEditionBallotCustomVotesSchema,
  editionBallotDraftKey,
} from "./ballot-schema";

describe("saveEditionBallotCustomVotesSchema", () => {
  it("requires exactly one of gameId or entryId", () => {
    const categoryId = "550e8400-e29b-41d4-a716-446655440000";
    const gameId = "550e8400-e29b-41d4-a716-446655440001";
    const entryId = "550e8400-e29b-41d4-a716-446655440002";
    expect(
      saveEditionBallotCustomVotesSchema.safeParse([
        { categoryId },
      ]).success,
    ).toBe(false);
    expect(
      saveEditionBallotCustomVotesSchema.safeParse([
        { categoryId, gameId, entryId },
      ]).success,
    ).toBe(false);
    expect(
      saveEditionBallotCustomVotesSchema.safeParse([
        { categoryId, entryId },
      ]).success,
    ).toBe(true);
  });

  it("rejects duplicate category picks", () => {
    const categoryId = "550e8400-e29b-41d4-a716-446655440000";
    const entryId = "550e8400-e29b-41d4-a716-446655440002";
    expect(
      saveEditionBallotCustomVotesSchema.safeParse([
        { categoryId, entryId },
        { categoryId, entryId },
      ]).success,
    ).toBe(false);
  });
});

describe("editionBallotDraftKey custom votes", () => {
  it("includes custom category votes in the dirty key", () => {
    const a = editionBallotDraftKey({
      items: [],
      categoryVotes: [],
      customCategoryVotes: [
        {
          categoryId: "c1",
          entryId: "e1",
          gameId: null,
        },
      ],
    });
    const b = editionBallotDraftKey({
      items: [],
      categoryVotes: [],
      customCategoryVotes: [],
    });
    expect(a).not.toBe(b);
  });
});

describe("filterCategoryVotesToEnabled", () => {
  it("keeps only enabled custom category ids", () => {
    expect(
      filterCategoryVotesToEnabled(
        [
          { categoryId: "a", entryId: "1" },
          { categoryId: "b", entryId: "2" },
        ],
        ["a"],
      ),
    ).toEqual([{ categoryId: "a", entryId: "1" }]);
  });
});
