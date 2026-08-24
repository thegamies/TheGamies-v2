import { describe, expect, it } from "vitest";
import {
  GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS,
  IGDB_GAME_TYPE,
  isGotyEligibleGameType,
} from "./igdb-game-types";

describe("isGotyEligibleGameType", () => {
  it("allows main games, expansions, remakes, and unknown type", () => {
    expect(isGotyEligibleGameType(null)).toBe(true);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.mainGame)).toBe(true);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.expansion)).toBe(true);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.standaloneExpansion)).toBe(
      true,
    );
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.remake)).toBe(true);
    expect(GOTY_ELIGIBLE_GAME_TYPE_IGDB_IDS).toContain(IGDB_GAME_TYPE.expansion);
  });

  it("rejects packs, DLC add-ons, and bundles", () => {
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.dlcAddon)).toBe(false);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.pack)).toBe(false);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.bundle)).toBe(false);
    expect(isGotyEligibleGameType(IGDB_GAME_TYPE.port)).toBe(false);
  });
});
