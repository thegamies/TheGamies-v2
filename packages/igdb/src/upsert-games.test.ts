import { describe, expect, it } from "vitest";
import {
  gameCompanies,
  gameGenres,
  gameKeywords,
  gamePlatforms,
  gameThemes,
} from "@thegamies/db";
import { gameJunctionDeleteSql } from "./upsert-games";

describe("gameJunctionDeleteSql", () => {
  it("deletes all five junction tables in one statement", () => {
    const query = gameJunctionDeleteSql(["game-1"]);
    const chunks = (query as { queryChunks: unknown[] }).queryChunks;
    expect(chunks).toContain(gamePlatforms);
    expect(chunks).toContain(gameGenres);
    expect(chunks).toContain(gameThemes);
    expect(chunks).toContain(gameKeywords);
    expect(chunks).toContain(gameCompanies);
  });
});
