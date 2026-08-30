import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANK_SCORE_LAYOUT,
  standingCardChrome,
} from "./standingCardLayout";

describe("standingCardChrome", () => {
  it("keeps rank in front of the title when scores are hidden", () => {
    expect(standingCardChrome("overhead", false)).toMatchObject({
      row: null,
      placeBeforeTitle: true,
      reserveTitle: true,
      votesUnderTitle: false,
      titleOffsetClass: "mt-2",
    });
  });

  it("defaults to votes hugging the last title line", () => {
    expect(DEFAULT_RANK_SCORE_LAYOUT).toBe("votes-under-title");
    expect(standingCardChrome(DEFAULT_RANK_SCORE_LAYOUT, true)).toEqual({
      row: null,
      placeBeforeTitle: true,
      reserveTitle: false,
      votesUnderTitle: true,
      rowGapClass: "",
      titleOffsetClass: "mt-1",
      tightRow: false,
    });
  });

  it("can place rank + score above the cover", () => {
    expect(standingCardChrome("overhead", true)).toEqual({
      row: "above",
      placeBeforeTitle: false,
      reserveTitle: true,
      votesUnderTitle: false,
      rowGapClass: "mb-2",
      titleOffsetClass: "mt-2",
      tightRow: false,
    });
  });

  it("tightens the gap from rank + score down to the cover", () => {
    expect(standingCardChrome("overhead-tight", true)).toMatchObject({
      row: "above",
      rowGapClass: "mb-0.5",
      tightRow: true,
    });
  });

  it("places rank + score under the cover, tight, with title after that row", () => {
    expect(standingCardChrome("below-cover", true)).toEqual({
      row: "below",
      placeBeforeTitle: false,
      reserveTitle: true,
      votesUnderTitle: false,
      rowGapClass: "mt-0.5",
      titleOffsetClass: "mt-0.5",
      tightRow: true,
    });
  });
});
