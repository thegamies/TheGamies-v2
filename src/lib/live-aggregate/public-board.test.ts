import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_BOARD_MIN_CATEGORY_VOTES,
  DEFAULT_PUBLIC_BOARD_MIN_LISTS,
  isPublicBoardReady,
  parsePublicBoardMinCategoryVotes,
  parsePublicBoardMinLists,
} from "./public-board";

describe("public board minimum", () => {
  it("defaults to five and hides boards below the floor", () => {
    expect(DEFAULT_PUBLIC_BOARD_MIN_LISTS).toBe(5);
    expect(DEFAULT_PUBLIC_BOARD_MIN_CATEGORY_VOTES).toBe(5);
    expect(isPublicBoardReady(4, 5)).toBe(false);
    expect(isPublicBoardReady(5, 5)).toBe(true);
    expect(isPublicBoardReady(12, 5)).toBe(true);
  });

  it("parses admin input with a safe default", () => {
    expect(parsePublicBoardMinLists("8")).toBe(8);
    expect(parsePublicBoardMinLists("0")).toBe(DEFAULT_PUBLIC_BOARD_MIN_LISTS);
    expect(parsePublicBoardMinLists("nope")).toBe(DEFAULT_PUBLIC_BOARD_MIN_LISTS);
    expect(parsePublicBoardMinLists(5000)).toBe(1000);
    expect(parsePublicBoardMinCategoryVotes("3")).toBe(3);
    expect(parsePublicBoardMinCategoryVotes("0")).toBe(
      DEFAULT_PUBLIC_BOARD_MIN_CATEGORY_VOTES,
    );
  });
});
