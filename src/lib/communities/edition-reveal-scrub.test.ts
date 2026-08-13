import { describe, expect, it } from "vitest";
import { ceremonyProgress } from "./edition-reveal-scrub";

describe("ceremonyProgress", () => {
  it("stays at 0 before the track reaches the top", () => {
    expect(ceremonyProgress(100, 400, 5000, 800)).toBe(0);
  });

  it("is 0 when scroll is flush with the track top", () => {
    expect(ceremonyProgress(400, 400, 5000, 800)).toBe(0);
  });

  it("advances from document scroll even if sticky rects lie", () => {
    const mid = ceremonyProgress(400 + 2100, 400, 5000, 800);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it("caps at 1 after the track has fully scrubbed", () => {
    expect(ceremonyProgress(400 + 5000, 400, 5000, 800)).toBe(1);
  });
});
