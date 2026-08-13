import { describe, expect, it } from "vitest";
import {
  gotyRevealGameLocal,
  gotyRevealGameMotion,
  gotyRevealLocalT,
  gotyRevealNumber,
  gotyRevealNumberShift,
  GOTY_REVEAL_TIED_PARK_Y_VH,
  gotyRevealRankUnits,
  gotyRevealTied,
} from "./edition-reveal-motion";

describe("gotyRevealRankUnits", () => {
  it("gives ties more scroll than a solo rank", () => {
    expect(gotyRevealRankUnits(3)).toBeGreaterThan(gotyRevealRankUnits(1));
    expect(gotyRevealRankUnits(2)).toBeGreaterThan(gotyRevealRankUnits(1));
  });

  it("adds about a full beat for each extra tied game", () => {
    const extra = gotyRevealRankUnits(5) - gotyRevealRankUnits(4);
    expect(extra).toBeGreaterThan(0.85);
  });
});

describe("gotyRevealLocalT", () => {
  it("starts the first rank at the number entrance", () => {
    const t = gotyRevealLocalT(0, 0, [1, 1]);
    expect(t).toBeCloseTo(0, 2);
  });

  it("overlaps so the next rank can enter before the prior exits", () => {
    const units = [1, 1, 1];
    const mid = gotyRevealLocalT(0.4, 1, units);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("gotyRevealNumber", () => {
  it("grows in then parks while staying opaque through mid-rank", () => {
    const units = gotyRevealRankUnits(1);
    // Sample by absolute rank units so longer scrub spans stay meaningful.
    const early = gotyRevealNumber(0.08 / units, units);
    const mid = gotyRevealNumber(0.55 / units, units);
    expect(early.opacity).toBeGreaterThan(0.2);
    expect(early.enter).toBeLessThan(1);
    expect(mid.opacity).toBeGreaterThan(0.9);
    expect(mid.park).toBeGreaterThan(0.9);
    expect(mid.scale).toBeLessThan(early.scale + 0.2);
  });
});

describe("gotyRevealNumberShift", () => {
  it("parks the glyph on the right, inset, inside the frame", () => {
    const parked = gotyRevealNumber(0.5, gotyRevealRankUnits(1));
    const frame = { width: 800, height: 600, topInset: 80, sideInset: 16 };
    const box = { width: 220, height: 240 };
    const shift = gotyRevealNumberShift(parked, box, frame);
    const w = box.width * shift.scale;
    const h = box.height * shift.scale;
    const cx = frame.width / 2 + shift.x;
    const cy = frame.height / 2 + shift.y;
    expect(cx + w / 2).toBeLessThanOrEqual(frame.width - 8);
    expect(cy - h / 2).toBeGreaterThanOrEqual(frame.topInset - 4);
    expect(shift.x).toBeGreaterThan(0);
    expect(Math.abs(shift.y - (GOTY_REVEAL_TIED_PARK_Y_VH / 100) * frame.height)).toBeLessThan(2);
  });

  it("keeps a wide glyph on-screen on a narrow phone frame", () => {
    const parked = gotyRevealNumber(0.55, gotyRevealRankUnits(1));
    const frame = { width: 360, height: 640, topInset: 96, sideInset: 12 };
    const box = { width: 280, height: 300 };
    const shift = gotyRevealNumberShift(parked, box, frame);
    const w = box.width * shift.scale;
    const cx = frame.width / 2 + shift.x;
    expect(cx - w / 2).toBeGreaterThanOrEqual(8);
    expect(cx + w / 2).toBeLessThanOrEqual(frame.width - 8);
  });
});

describe("gotyRevealTied", () => {
  it("stays hidden for solo ranks", () => {
    expect(gotyRevealTied(0.5, false, 1).opacity).toBe(0);
  });

  it("enters then lifts to the parked Tied row", () => {
    const units = gotyRevealRankUnits(2);
    const mid = gotyRevealTied(0.52 / units, true, units);
    const up = gotyRevealTied(0.75 / units, true, units);
    expect(mid.opacity).toBeGreaterThan(0.5);
    expect(up.yVh).toBeLessThan(mid.yVh);
    expect(up.yVh).toBeCloseTo(GOTY_REVEAL_TIED_PARK_Y_VH, 0);
  });
});

describe("gotyRevealGameLocal", () => {
  it("staggers tied covers so the second starts after the first", () => {
    const units = gotyRevealRankUnits(2);
    const a = gotyRevealGameLocal(0.4, 0, 2, true, units);
    const b = gotyRevealGameLocal(0.4, 1, 2, true, units);
    expect(a).toBeGreaterThan(b);
  });
});

describe("gotyRevealGameMotion", () => {
  it("slides in from the left then exits right", () => {
    const enter = gotyRevealGameMotion(0.2);
    const full = gotyRevealGameMotion(0.5);
    const exit = gotyRevealGameMotion(0.9);
    expect(enter.xVw).toBeLessThan(0);
    expect(full.opacity).toBeGreaterThan(0.9);
    expect(exit.xVw).toBeGreaterThan(0);
  });
});
