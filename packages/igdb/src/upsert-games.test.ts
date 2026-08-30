import { describe, expect, it } from "vitest";
import {
  gameArtworks,
  gameCompanies,
  gameGenres,
  gameKeywords,
  gamePlatforms,
  gameScreenshots,
  gameThemes,
  gameVideoLinks,
} from "@thegamies/db";
import {
  gameJunctionDeleteSql,
  gameLinksChecksum,
  igdbIdsNeedingLinkRewrite,
} from "./upsert-games";

const emptyLinks = {
  platformIgdbIds: [] as number[],
  genreIgdbIds: [] as number[],
  themeIgdbIds: [] as number[],
  keywordIgdbIds: [] as number[],
  involvedCompanyIgdbIds: [] as number[],
  artworkIgdbIds: [] as number[],
  screenshotIgdbIds: [] as number[],
  videoIgdbIds: [] as number[],
};

describe("gameLinksChecksum", () => {
  it("ignores order and duplicate ids", () => {
    expect(
      gameLinksChecksum({
        ...emptyLinks,
        platformIgdbIds: [2, 1, 1],
      }),
    ).toBe(
      gameLinksChecksum({
        ...emptyLinks,
        platformIgdbIds: [1, 2],
      }),
    );
  });

  it("changes when a linked id is removed", () => {
    expect(
      gameLinksChecksum({
        ...emptyLinks,
        platformIgdbIds: [1, 2],
      }),
    ).not.toBe(
      gameLinksChecksum({
        ...emptyLinks,
        platformIgdbIds: [1],
      }),
    );
  });
});

describe("igdbIdsNeedingLinkRewrite", () => {
  it("skips games whose stored checksum already matches", () => {
    expect(
      igdbIdsNeedingLinkRewrite(
        [{ igdbId: 1, checksum: "same" }],
        new Map([[1, "same"]]),
      ),
    ).toEqual(new Set());
  });

  it("rewrites new games and checksum changes", () => {
    expect(
      igdbIdsNeedingLinkRewrite(
        [
          { igdbId: 1, checksum: "new" },
          { igdbId: 2, checksum: "b" },
        ],
        new Map([[1, "old"]]),
      ),
    ).toEqual(new Set([1, 2]));
  });

  it("rewrites existing rows that have never stored a checksum", () => {
    expect(
      igdbIdsNeedingLinkRewrite(
        [{ igdbId: 1, checksum: "a" }],
        new Map([[1, null]]),
      ),
    ).toEqual(new Set([1]));
  });
});

describe("gameJunctionDeleteSql", () => {
  it("deletes platform, credit, and media junction tables in one statement", () => {
    const query = gameJunctionDeleteSql(["game-1"]);
    const chunks = (query as { queryChunks: unknown[] }).queryChunks;
    expect(chunks).toContain(gamePlatforms);
    expect(chunks).toContain(gameGenres);
    expect(chunks).toContain(gameThemes);
    expect(chunks).toContain(gameKeywords);
    expect(chunks).toContain(gameCompanies);
    expect(chunks).toContain(gameArtworks);
    expect(chunks).toContain(gameScreenshots);
    expect(chunks).toContain(gameVideoLinks);
  });
});
