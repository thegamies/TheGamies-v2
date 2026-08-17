import { describe, expect, it } from "vitest";
import {
  groupPreviewItemsByListId,
  parseJsonArray,
  takePreviewItems,
} from "./profile-preview";
import { PROFILE_LIST_PREVIEW_ITEM_LIMIT } from "@/lib/profile/profile-page";

describe("takePreviewItems", () => {
  it("caps at five items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(takePreviewItems(items)).toEqual([1, 2, 3, 4, 5]);
    expect(takePreviewItems(items).length).toBe(PROFILE_LIST_PREVIEW_ITEM_LIMIT);
  });

  it("keeps shorter lists intact", () => {
    expect(takePreviewItems([1, 2])).toEqual([1, 2]);
    expect(takePreviewItems([])).toEqual([]);
  });
});

describe("groupPreviewItemsByListId", () => {
  it("groups by list and caps each at five", () => {
    const rows = [
      {
        listId: "a",
        gameId: "1",
        slug: "one",
        title: "One",
        coverUrl: null,
        rank: 1,
      },
      {
        listId: "a",
        gameId: "2",
        slug: "two",
        title: "Two",
        coverUrl: null,
        rank: 2,
      },
      {
        listId: "b",
        gameId: "3",
        slug: "three",
        title: "Three",
        coverUrl: null,
        rank: 1,
      },
      ...Array.from({ length: 6 }, (_, index) => ({
        listId: "c",
        gameId: String(index + 1),
        slug: `g${index + 1}`,
        title: `G${index + 1}`,
        coverUrl: null,
        rank: index + 1,
      })),
    ];
    const grouped = groupPreviewItemsByListId(rows);
    expect(grouped.get("a")?.map((item) => item.gameId)).toEqual(["1", "2"]);
    expect(grouped.get("b")?.map((item) => item.gameId)).toEqual(["3"]);
    expect(grouped.get("c")?.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("parseJsonArray", () => {
  it("accepts arrays and JSON strings", () => {
    expect(parseJsonArray([1])).toEqual([1]);
    expect(parseJsonArray("[1,2]")).toEqual([1, 2]);
    expect(parseJsonArray("nope")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });
});

describe("takePreviewItems", () => {
  it("caps at five items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(takePreviewItems(items)).toEqual([1, 2, 3, 4, 5]);
    expect(takePreviewItems(items).length).toBe(PROFILE_LIST_PREVIEW_ITEM_LIMIT);
  });

  it("keeps shorter lists intact", () => {
    expect(takePreviewItems([1, 2])).toEqual([1, 2]);
    expect(takePreviewItems([])).toEqual([]);
  });
});

describe("parseJsonArray", () => {
  it("accepts arrays and JSON strings", () => {
    expect(parseJsonArray([1])).toEqual([1]);
    expect(parseJsonArray("[1,2]")).toEqual([1, 2]);
    expect(parseJsonArray("nope")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });
});
