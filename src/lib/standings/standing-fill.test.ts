import { describe, expect, it } from "vitest";
import {
  DEFAULT_STANDING_FILL_MIN_VISIBLE,
  STANDING_FILL_SCOPE_CLASS,
  parseStandingFillMinVisible,
  standingFillMinVisibleVars,
} from "./standing-fill";

describe("parseStandingFillMinVisible", () => {
  it("keeps one decimal and allows a fractional peek", () => {
    expect(DEFAULT_STANDING_FILL_MIN_VISIBLE).toBe(2.2);
    expect(parseStandingFillMinVisible("2.2")).toBe(2.2);
    expect(parseStandingFillMinVisible(3.25)).toBe(3.3);
    expect(parseStandingFillMinVisible(3)).toBe(3);
  });

  it("defaults invalid values and clamps the range", () => {
    expect(parseStandingFillMinVisible("nope")).toBe(
      DEFAULT_STANDING_FILL_MIN_VISIBLE,
    );
    expect(parseStandingFillMinVisible(0)).toBe(
      DEFAULT_STANDING_FILL_MIN_VISIBLE,
    );
    expect(parseStandingFillMinVisible(9)).toBe(5);
  });
});

describe("standingFillMinVisibleVars", () => {
  it("writes the CSS custom property used by fill-row cards", () => {
    expect(STANDING_FILL_SCOPE_CLASS).toBe("standing-fill-scope");
    expect(standingFillMinVisibleVars(2.2)).toEqual({
      "--standing-fill-min-visible": "2.2",
    });
    expect(standingFillMinVisibleVars(2.5)).toEqual({
      "--standing-fill-min-visible": "2.5",
    });
  });
});
