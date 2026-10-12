import { createDb } from "@thegamies/db";
import { describe, expect, it } from "vitest";
import {
  browseGamesSearchQuery,
  isDefaultCatalogCountInput,
  sliceSearchPage,
  upcomingReleaseWindow,
} from "./catalog";

describe("upcomingReleaseWindow", () => {
  it("starts at UTC midnight and ends six months later on the same calendar day", () => {
    const { after, onOrBefore } = upcomingReleaseWindow(
      new Date("2026-09-15T18:40:00.000Z"),
    );
    expect(after.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(onOrBefore.toISOString()).toBe("2027-03-15T00:00:00.000Z");
  });
});

describe("isDefaultCatalogCountInput", () => {
  it("matches the unfiltered /games hub", () => {
    expect(isDefaultCatalogCountInput({})).toBe(true);
    expect(isDefaultCatalogCountInput({ releaseStatus: "all" })).toBe(true);
  });

  it("rejects search, year, and eligibility filters", () => {
    expect(isDefaultCatalogCountInput({ q: "hades" })).toBe(false);
    expect(isDefaultCatalogCountInput({ year: 2026 })).toBe(false);
    expect(isDefaultCatalogCountInput({ releaseStatus: "upcoming" })).toBe(
      false,
    );
    expect(isDefaultCatalogCountInput({ excludeEditions: true })).toBe(false);
    expect(isDefaultCatalogCountInput({ gotyEligibleTypes: true })).toBe(false);
    expect(isDefaultCatalogCountInput({ includeAdult: true })).toBe(false);
  });
});

describe("browseGamesSearchQuery", () => {
  const db = createDb("postgresql://user:pass@127.0.0.1/thegamies");

  it("matches before sorting, then joins covers for the page", () => {
    const { sql } = browseGamesSearchQuery(db, {
      q: "portal",
      limit: 49,
    }).toSQL();
    const normalized = sql.toLowerCase();
    const matchOffset = normalized.indexOf("offset 0");
    const limitAt = normalized.indexOf("limit");
    const coversAt = normalized.lastIndexOf("covers");
    expect(matchOffset).toBeGreaterThan(-1);
    expect(limitAt).toBeGreaterThan(matchOffset);
    expect(coversAt).toBeGreaterThan(limitAt);
    expect(normalized).toContain("ilike");
    expect(normalized).toContain("title");
    expect(normalized).toContain("slug");
  });
});

describe("sliceSearchPage", () => {
  it("keeps page size and reports a following page from the extra row", () => {
    const rows = [1, 2, 3, 4];
    expect(sliceSearchPage(rows, 3)).toEqual({
      items: [1, 2, 3],
      hasMore: true,
    });
    expect(sliceSearchPage([1, 2], 3)).toEqual({
      items: [1, 2],
      hasMore: false,
    });
  });
});
