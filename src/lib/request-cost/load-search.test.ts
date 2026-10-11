import { describe, expect, it } from "vitest";
import type { LoadtestGame } from "@/lib/qa/loadtest";
import {
  loadGamesSearchPath,
  loadSearchTitle,
  pickLoadSearchQuery,
} from "./load-search";

const pool: LoadtestGame[] = [
  {
    id: "g1",
    slug: "the-legend-of-zelda-breath-of-the-wild",
    igdbId: 1,
    band: "popular",
    title: "The Legend of Zelda: Breath of the Wild",
  },
];

function queue(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[Math.min(i, values.length - 1)]!;
    i += 1;
    return v;
  };
}

describe("loadSearchTitle", () => {
  it("uses catalog title, then slug words", () => {
    expect(loadSearchTitle(pool[0]!)).toBe("The Legend of Zelda: Breath of the Wild");
    expect(
      loadSearchTitle({ id: "x", slug: "hades", igdbId: 2, band: "popular" }),
    ).toBe("hades");
  });
});

describe("pickLoadSearchQuery", () => {
  it("prefers the full title", () => {
    expect(pickLoadSearchQuery(pool, queue([0.1, 0.1]))).toEqual({
      q: "The Legend of Zelda: Breath of the Wild",
      kind: "title",
    });
  });

  it("uses a mid-length token", () => {
    expect(pickLoadSearchQuery(pool, queue([0.1, 0.7])).kind).toBe("partial");
  });

  it("uses a 2-3 character prefix", () => {
    const pick = pickLoadSearchQuery(pool, queue([0.1, 0.95, 0.1]));
    expect(pick.kind).toBe("short");
    expect(pick.q.length).toBeGreaterThanOrEqual(2);
    expect(pick.q.length).toBeLessThanOrEqual(3);
  });
});

describe("loadGamesSearchPath", () => {
  const fixtures = { game: { id: "g1", slug: "hades", igdbId: 1 }, games: pool };

  it("builds browse and typeahead URLs", () => {
    expect(loadGamesSearchPath("browse", fixtures, queue([0.1, 0.1]))).toBe(
      "/games?q=The+Legend+of+Zelda%3A+Breath+of+the+Wild",
    );
    expect(loadGamesSearchPath("api", fixtures, queue([0.1, 0.1]))).toBe(
      "/api/games/search?q=The%20Legend%20of%20Zelda%3A%20Breath%20of%20the%20Wild",
    );
  });
});
