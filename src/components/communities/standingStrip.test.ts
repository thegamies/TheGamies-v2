import { describe, expect, it } from "vitest";
import { fitDisplayReservePx } from "@/components/ui/FitDisplayTitle";
import { standingStripColClass } from "./StandingGameCard";

describe("standingStripColClass", () => {
  it("uses a 2-row subgrid so cover and caption sit on separate tracks", () => {
    expect(standingStripColClass(false)).toContain("grid-rows-subgrid");
    expect(standingStripColClass(false)).toContain("row-span-2");
    expect(standingStripColClass(true)).toContain("w-[168px]");
    expect(standingStripColClass(false)).toContain("w-[132px]");
  });
});

describe("fitDisplayReservePx", () => {
  it("reserves lines × maxPx × snug line-height", () => {
    expect(fitDisplayReservePx(2, 18)).toBe(Math.ceil(2 * 18 * 1.375));
  });
});
