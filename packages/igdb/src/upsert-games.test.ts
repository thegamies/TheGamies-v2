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
import { gameJunctionDeleteSql } from "./upsert-games";

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
