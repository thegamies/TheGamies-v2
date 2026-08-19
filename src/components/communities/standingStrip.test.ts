import { describe, expect, it } from "vitest";
import { fitDisplayReservePx } from "@/components/ui/FitDisplayTitle";
import {
  standingFillFiveColClass,
  standingFillFiveFlowClass,
  standingFillFiveListClass,
  standingStripColClass,
} from "./StandingGameCard";

describe("standingStripColClass", () => {
  it("uses a 2-row subgrid so cover and caption sit on separate tracks", () => {
    expect(standingStripColClass(false)).toContain("grid-rows-subgrid");
    expect(standingStripColClass(false)).toContain("row-span-2");
    expect(standingStripColClass(true)).toContain("w-[168px]");
    expect(standingStripColClass(false)).toContain("w-[132px]");
  });
});

describe("standingFillFiveColClass", () => {
  it("sizes three equal columns on mobile, five from sm, and keeps overflow on one track", () => {
    expect(standingFillFiveListClass).toContain("grid-flow-col");
    expect(standingFillFiveListClass).toContain("(100cqi_-_1rem)/3");
    expect(standingFillFiveListClass).toContain(
      "sm:[grid-auto-columns:calc((100cqi_-_4rem)/5)]",
    );
    expect(standingFillFiveListClass).not.toContain("(100cqi_-_2rem)/5");
    expect(standingFillFiveListClass).toContain("overflow-y-hidden");
    expect(standingFillFiveFlowClass).toContain("(100cqi_-_1rem)/3");
    expect(standingFillFiveFlowClass).toContain(
      "sm:[grid-auto-columns:calc((100cqi_-_4rem)/5)]",
    );
    expect(standingFillFiveColClass()).toContain("min-w-0");
    expect(standingFillFiveColClass()).not.toContain("w-[132px]");
  });
});

describe("fitDisplayReservePx", () => {
  it("reserves lines × maxPx × snug line-height", () => {
    expect(fitDisplayReservePx(2, 18)).toBe(Math.ceil(2 * 18 * 1.375));
  });
});
