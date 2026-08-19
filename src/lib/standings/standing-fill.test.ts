import { describe, expect, it } from "vitest";
import {
  DEFAULT_STANDING_FILL_MIN_VISIBLE,
  parseStandingFillMinVisible,
  standingFillMinVisibleVars,
} from "./standing-fill";

describe("parseStandingFillMinVisible", () => {
  it("keeps one decimal and allows a fractional peek", () => {
    expect(parseStandingFillMinVisible("3.2")).toBe(3.2);
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
    expect(standingFillMinVisibleVars(3.2)).toEqual({
      "--standing-fill-min-visible": "3.2",
    });
  });
});
