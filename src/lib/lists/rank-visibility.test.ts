import { describe, expect, it } from "vitest";
import {
  listPublicIndexable,
  orderItemsForPublicView,
  viewerCanOpenList,
  viewerSeesListCategories,
  viewerSeesListRanks,
} from "./rank-visibility";

describe("list rank visibility gates", () => {
  it("hides hidden lists from non-editors", () => {
    expect(viewerCanOpenList("hidden", false)).toBe(false);
    expect(viewerCanOpenList("hidden", true)).toBe(true);
    expect(viewerCanOpenList("games_only", false)).toBe(true);
    expect(listPublicIndexable("hidden")).toBe(false);
    expect(listPublicIndexable("ranked")).toBe(true);
  });

  it("shows ranks and categories only when ranked or editor", () => {
    expect(viewerSeesListRanks("games_only", false)).toBe(false);
    expect(viewerSeesListRanks("games_only", true)).toBe(true);
    expect(viewerSeesListCategories("games_only", false)).toBe(false);
    expect(viewerSeesListRanks("ranked", false)).toBe(true);
  });

  it("orders public games-only covers by title", () => {
    const items = [
      { title: "Zelda", rank: 1 },
      { title: "Astro", rank: 2 },
    ];
    expect(orderItemsForPublicView(items, true).map((i) => i.title)).toEqual([
      "Astro",
      "Zelda",
    ]);
    expect(orderItemsForPublicView(items, false).map((i) => i.title)).toEqual([
      "Zelda",
      "Astro",
    ]);
  });
});
