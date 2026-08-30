import { describe, expect, it } from "vitest";
import {
  computePopularity,
  coverUrlFromImageId,
  wideImageUrlFromImageId,
  youtubePosterUrl,
  isAdultGame,
  mapIgdbGame,
  yearUnixRange,
  buildEntityPageQuery,
  type AdultFilters,
  type IgdbGame,
} from "./client";

const filters: AdultFilters = {
  eroticThemeId: 42,
  erogeKeywordId: 99,
};

describe("computePopularity", () => {
  it("weights rating count, follows, and hypes", () => {
    expect(
      computePopularity({
        id: 1,
        total_rating_count: 10,
        follows: 3,
        hypes: 2,
      }),
    ).toBe(10 * 4 + 3 * 2 + 2 * 3);
  });

  it("treats missing signals as zero", () => {
    expect(computePopularity({ id: 1 })).toBe(0);
  });
});

describe("isAdultGame", () => {
  it("flags erotic theme or eroge keyword", () => {
    expect(isAdultGame({ id: 1, themes: [42] }, filters)).toBe(true);
    expect(isAdultGame({ id: 1, keywords: [99] }, filters)).toBe(true);
    expect(isAdultGame({ id: 1, themes: [1], keywords: [2] }, filters)).toBe(
      false,
    );
  });
});

describe("mapIgdbGame", () => {
  it("returns null without a title", () => {
    expect(mapIgdbGame({ id: 1 }, filters)).toBeNull();
  });

  it("maps core fields and junction id lists", () => {
    const game: IgdbGame = {
      id: 100,
      name: "  Example Game  ",
      slug: "example-game",
      summary: " A summary ",
      first_release_date: Date.UTC(2026, 5, 15) / 1000,
      cover: 55,
      game_type: 0,
      platforms: [6, 48],
      genres: [12],
      themes: [1],
      keywords: [2],
      involved_companies: [9],
      artworks: [21, 22],
      screenshots: [31],
      videos: [41],
      total_rating: 88.4,
      total_rating_count: 5,
      follows: 1,
      hypes: 2,
    };
    const mapped = mapIgdbGame(game, filters);
    expect(mapped).toMatchObject({
      igdbId: 100,
      slug: "example-game",
      title: "Example Game",
      summary: "A summary",
      year: 2026,
      coverIgdbId: 55,
      gameTypeIgdbId: 0,
      isAdult: false,
      rating: 88,
      platformIgdbIds: [6, 48],
      genreIgdbIds: [12],
      involvedCompanyIgdbIds: [9],
      artworkIgdbIds: [21, 22],
      screenshotIgdbIds: [31],
      videoIgdbIds: [41],
    });
    expect(mapped?.firstReleaseDate?.toISOString()).toBe(
      "2026-06-15T00:00:00.000Z",
    );
  });

  it("slugifies when IGDB slug is missing", () => {
    const mapped = mapIgdbGame({ id: 7, name: "Hello World!" }, filters);
    expect(mapped?.slug).toBe("hello-world-7");
  });

  it("marks adult from filters", () => {
    const mapped = mapIgdbGame(
      { id: 1, name: "X", themes: [42] },
      filters,
    );
    expect(mapped?.isAdult).toBe(true);
  });
});

describe("yearUnixRange", () => {
  it("covers the UTC calendar year", () => {
    const { start, end } = yearUnixRange(2026);
    expect(new Date(start * 1000).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(new Date(end * 1000).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("buildEntityPageQuery", () => {
  it("walks by id from lowest", () => {
    expect(
      buildEntityPageQuery({
        fields: "id, name",
        afterId: 0,
        limit: 500,
      }),
    ).toBe("fields id, name; where id > 0; sort id asc; limit 500;");
  });

  it("adds updated_at for date walks and keeps id order", () => {
    expect(
      buildEntityPageQuery({
        fields: "fields id, name;",
        afterId: 40,
        limit: 500,
        sinceUnix: 1_700_000_000,
      }),
    ).toBe(
      "fields id, name; where id > 40 & updated_at >= 1700000000; sort id asc; limit 500;",
    );
  });

  it("supports a year extra filter", () => {
    const { start, end } = yearUnixRange(2026);
    expect(
      buildEntityPageQuery({
        fields: "fields id;",
        afterId: 0,
        limit: 500,
        extraWhere: `first_release_date >= ${start} & first_release_date < ${end}`,
      }),
    ).toContain(`first_release_date >= ${start} & first_release_date < ${end}`);
  });
});

describe("wideImageUrlFromImageId", () => {
  it("uses t_720p", () => {
    expect(wideImageUrlFromImageId("co9wvg")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_720p/co9wvg.jpg",
    );
  });
});

describe("youtubePosterUrl", () => {
  it("uses hqdefault on i.ytimg.com", () => {
    expect(youtubePosterUrl("abc")).toBe(
      "https://i.ytimg.com/vi/abc/hqdefault.jpg",
    );
  });
});

describe("coverUrlFromImageId", () => {
  it("builds the IGDB CDN URL", () => {
    expect(coverUrlFromImageId("co9wvg")).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co9wvg.jpg",
    );
  });

  it("returns null when missing", () => {
    expect(coverUrlFromImageId(null)).toBeNull();
    expect(coverUrlFromImageId(undefined)).toBeNull();
    expect(coverUrlFromImageId("")).toBeNull();
  });
});
