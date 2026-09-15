import { describe, expect, it } from "vitest";
import {
  communitySitemapPaths,
  formatSitemapShardId,
  ownedListSitemapPath,
  parseSitemapShardId,
  shouldIndexCommunityBoards,
  shouldIndexGamesHub,
  shouldIndexProfile,
  SITEMAP_GAMES_MAX,
  SITEMAP_STATIC_PATHS,
  sitemapCatalogYears,
  sitemapPageCount,
  sitemapShardsForCounts,
} from "./sitemap-plan";

describe("sitemap shards", () => {
  it("always includes the static shard", () => {
    expect(sitemapShardsForCounts({
      games: 0,
      communities: 0,
    })).toEqual([{ kind: "static", page: 0 }]);
  });

  it("pages games and communities only", () => {
    const shards = sitemapShardsForCounts({
      games: 12_000,
      communities: 3,
    });
    expect(shards.map(formatSitemapShardId)).toEqual([
      "static",
      "games-0",
      "games-1",
      "games-2",
      "communities-0",
    ]);
  });

  it("parses shard ids", () => {
    expect(parseSitemapShardId("static")).toEqual({ kind: "static", page: 0 });
    expect(parseSitemapShardId("games-2")).toEqual({ kind: "games", page: 2 });
    expect(parseSitemapShardId("profiles-0")).toBeNull();
    expect(parseSitemapShardId("nope")).toBeNull();
  });

  it("caps valued catalog URLs", () => {
    expect(SITEMAP_GAMES_MAX).toBe(5000);
  });

  it("includes About feature pages in the static sitemap", () => {
    expect(SITEMAP_STATIC_PATHS).toEqual(
      expect.arrayContaining([
        "/about",
        "/about/lists",
        "/about/communities",
        "/about/library",
        "/about/people",
        "/about/pickem",
      ]),
    );
    expect(SITEMAP_STATIC_PATHS).not.toContain(
      "/game-of-the-year/2025/recap",
    );
  });

  it("lists this year and last year for catalog URLs", () => {
    expect(sitemapCatalogYears(new Date("2026-09-01T12:00:00.000Z"))).toEqual([
      2026, 2025,
    ]);
    expect(sitemapCatalogYears(new Date("2027-01-01T00:00:00.000Z"))).toEqual([
      2027, 2026,
    ]);
  });

  it("indexes the games hub and not later catalog pages", () => {
    expect(shouldIndexGamesHub(1)).toBe(true);
    expect(shouldIndexGamesHub(2)).toBe(false);
  });

  it("counts pages", () => {
    expect(sitemapPageCount(0)).toBe(0);
    expect(sitemapPageCount(5000)).toBe(1);
    expect(sitemapPageCount(5001)).toBe(2);
  });
});

describe("sitemap include rules", () => {
  it("indexes public living profiles only", () => {
    expect(shouldIndexProfile({ visibility: "public", deletedAt: null })).toBe(
      true,
    );
    expect(shouldIndexProfile({ visibility: "private" })).toBe(false);
    expect(
      shouldIndexProfile({ visibility: "public", deletedAt: new Date() }),
    ).toBe(false);
  });

  it("indexes showcase community interiors, not ordinary public homes only", () => {
    expect(
      shouldIndexCommunityBoards({
        visibility: "public",
        joinsClosed: true,
      }),
    ).toBe(true);
    expect(
      shouldIndexCommunityBoards({
        visibility: "public",
        joinsClosed: false,
      }),
    ).toBe(false);
    expect(
      communitySitemapPaths({
        slug: "demo-community",
        visibility: "public",
        joinsClosed: true,
        editionYears: [2025, 2024],
        tgaYears: [2025],
      }),
    ).toEqual([
      "/communities/demo-community",
      "/communities/demo-community/trending",
      "/communities/demo-community/edition/2025",
      "/communities/demo-community/edition/2024",
      "/communities/demo-community/the-game-awards/2025",
    ]);
    expect(
      communitySitemapPaths({
        slug: "open-join",
        visibility: "public",
        joinsClosed: false,
        editionYears: [2025],
        tgaYears: [2025],
      }),
    ).toEqual(["/communities/open-join"]);
  });

  it("builds owned list paths when slug and username exist", () => {
    expect(ownedListSitemapPath({ username: "alex", slug: "goty-2026" })).toBe(
      "/u/alex/goty-2026",
    );
    expect(ownedListSitemapPath({ username: "alex", slug: null })).toBeNull();
  });
});
