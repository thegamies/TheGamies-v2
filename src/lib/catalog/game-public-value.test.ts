import { describe, expect, it } from "vitest";
import { gameHasPublicSiteValueFromSignals } from "./game-public-value-signals";

describe("gameHasPublicSiteValueFromSignals", () => {
  it("is true when the game has a public GOTY rank", () => {
    expect(
      gameHasPublicSiteValueFromSignals({
        hasGotyPresence: true,
        categoryWinCount: 0,
        publicListCount: 0,
      }),
    ).toBe(true);
  });

  it("is true for a public category #1 or a public list", () => {
    expect(
      gameHasPublicSiteValueFromSignals({
        hasGotyPresence: false,
        categoryWinCount: 1,
        publicListCount: 0,
      }),
    ).toBe(true);
    expect(
      gameHasPublicSiteValueFromSignals({
        hasGotyPresence: false,
        categoryWinCount: 0,
        publicListCount: 2,
      }),
    ).toBe(true);
  });

  it("is false for an IGDB-only catalog row", () => {
    expect(
      gameHasPublicSiteValueFromSignals({
        hasGotyPresence: false,
        categoryWinCount: 0,
        publicListCount: 0,
      }),
    ).toBe(false);
  });
});
