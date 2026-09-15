import { describe, expect, it } from "vitest";
import { orderLandingStandingsBoards } from "./landing-order";

describe("orderLandingStandingsBoards", () => {
  it("puts the newest year first even when an older year is revealed", () => {
    const ordered = orderLandingStandingsBoards([
      { year: 2026, detailedStatsRevealed: false },
      { year: 2025, detailedStatsRevealed: true },
      { year: 2024, detailedStatsRevealed: true },
    ]);
    expect(ordered.map((row) => row.year)).toEqual([2026, 2025, 2024]);
  });
});
