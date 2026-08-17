import { describe, expect, it } from "vitest";
import {
  editionCategoriesWriteBlockedReason,
  filterRowsByEnabledCategoryIds,
  searchSiteAwardCategories,
} from "./edition-categories";
import { editionCategoryStandingsHref } from "./edition-results-href";

describe("filterRowsByEnabledCategoryIds", () => {
  it("drops rows whose category is no longer on the event", () => {
    const enabled = new Set(["best-art", "best-audio"]);
    expect(
      filterRowsByEnabledCategoryIds(
        [
          { categoryId: "best-art", votes: 3 },
          { categoryId: "removed", votes: 9 },
          { categoryId: "best-audio", votes: 1 },
        ],
        enabled,
      ),
    ).toEqual([
      { categoryId: "best-art", votes: 3 },
      { categoryId: "best-audio", votes: 1 },
    ]);
  });

  it("returns nothing when the event has no enabled awards", () => {
    expect(
      filterRowsByEnabledCategoryIds(
        [{ categoryId: "best-art", votes: 3 }],
        new Set(),
      ),
    ).toEqual([]);
  });
});

describe("searchSiteAwardCategories", () => {
  it("returns no rows for a blank query without requiring a catalog", async () => {
    await expect(searchSiteAwardCategories({ q: "   " })).resolves.toEqual([]);
    await expect(searchSiteAwardCategories({ q: "" })).resolves.toEqual([]);
  });
});

describe("editionCategoriesWriteBlockedReason", () => {
  it("blocks after close or publish", () => {
    expect(editionCategoriesWriteBlockedReason("scheduled")).toBeNull();
    expect(editionCategoriesWriteBlockedReason("open")).toBeNull();
    expect(editionCategoriesWriteBlockedReason("closed")).toMatch(
      /before voting closes/i,
    );
    expect(editionCategoriesWriteBlockedReason("published")).toMatch(
      /before voting closes/i,
    );
  });
});

describe("editionCategoryStandingsHref page", () => {
  it("omits page=1 and includes page>1", () => {
    expect(
      editionCategoryStandingsHref("crew", 2026, "goty", { page: 1 }),
    ).toBe("/communities/crew/edition/2026?view=category&category=goty");
    expect(
      editionCategoryStandingsHref("crew", 2026, "goty", { page: 2 }),
    ).toBe(
      "/communities/crew/edition/2026?view=category&category=goty&page=2",
    );
  });
});
