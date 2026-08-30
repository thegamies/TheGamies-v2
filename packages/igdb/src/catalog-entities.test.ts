import { describe, expect, it } from "vitest";
import {
  CATALOG_ENTITY_ORDER,
  involvedCompaniesForKnownGames,
  nextCatalogEntity,
  ttbRowsForKnownGames,
} from "./catalog-entities";
import { parseAllRunScope, parseSinceUnix } from "./catalog-sync";

describe("nextCatalogEntity", () => {
  it("starts at image types and skips completed lookups", () => {
    expect(nextCatalogEntity([])).toBe("image_types");
    expect(nextCatalogEntity(["image_types", "platforms"])).toBe("genres");
  });

  it("returns null when every entity is done", () => {
    expect(nextCatalogEntity(CATALOG_ENTITY_ORDER)).toBeNull();
  });
});

describe("parseAllRunScope", () => {
  it("resumes the current entity without inheriting a previous id space", () => {
    const parsed = parseAllRunScope(
      {
        currentEntity: "covers",
        completed: ["image_types", "platforms", "genres", "themes", "keywords", "game_types", "companies", "games"],
      },
      "catalog",
    );
    expect(parsed?.currentEntity).toBe("covers");
    expect(parsed?.completed).toContain("games");
  });
});

describe("involvedCompaniesForKnownGames", () => {
  it("skips rows whose game is missing locally", () => {
    const keep = involvedCompaniesForKnownGames(
      [
        { id: 1, game: 10, company: 3 },
        { id: 2, game: 99, company: 4 },
        { id: 3, company: 5 },
      ],
      new Set([10]),
    );
    expect(keep.map((row) => row.id)).toEqual([1]);
  });
});

describe("ttbRowsForKnownGames", () => {
  it("skips time-to-beat rows for unknown games", () => {
    const keep = ttbRowsForKnownGames(
      [
        { id: 1, game_id: 10, hastily: 1 },
        { id: 2, game_id: 11, hastily: 2 },
        { id: 3, hastily: 3 },
      ],
      new Set([10]),
    );
    expect(keep.map((row) => row.id)).toEqual([1]);
  });
});

describe("parseSinceUnix", () => {
  it("accepts unix seconds and ISO dates", () => {
    expect(parseSinceUnix("1700000100")).toBe(1700000100);
    expect(parseSinceUnix("2024-01-01T00:00:00Z")).toBe(
      Date.parse("2024-01-01T00:00:00Z") / 1000,
    );
  });

  it("rejects invalid values", () => {
    expect(() => parseSinceUnix("not-a-date")).toThrow(/Invalid --since/);
  });
});
