import { describe, expect, it } from "vitest";
import {
  formatSitemapShardId,
  ownedListSitemapPath,
  parseSitemapShardId,
  shouldIndexProfile,
  sitemapPageCount,
  sitemapShardsForCounts,
} from "./sitemap-plan";

describe("sitemap shards", () => {
  it("always includes the static shard", () => {
    expect(sitemapShardsForCounts({
      games: 0,
      profiles: 0,
      lists: 0,
      communities: 0,
    })).toEqual([{ kind: "static", page: 0 }]);
  });

  it("pages large collections", () => {
    const shards = sitemapShardsForCounts({
      games: 12_000,
      profiles: 1,
      lists: 0,
      communities: 3,
    });
    expect(shards.map(formatSitemapShardId)).toEqual([
      "static",
      "games-0",
      "games-1",
      "games-2",
      "profiles-0",
      "communities-0",
    ]);
  });

  it("parses shard ids", () => {
    expect(parseSitemapShardId("static")).toEqual({ kind: "static", page: 0 });
    expect(parseSitemapShardId("games-2")).toEqual({ kind: "games", page: 2 });
    expect(parseSitemapShardId("nope")).toBeNull();
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

  it("builds owned list paths when slug and username exist", () => {
    expect(ownedListSitemapPath({ username: "alex", slug: "goty-2026" })).toBe(
      "/u/alex/goty-2026",
    );
    expect(ownedListSitemapPath({ username: "alex", slug: null })).toBeNull();
  });
});
