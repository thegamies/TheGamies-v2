import { describe, expect, it } from "vitest";
import { orderLandingStandingsBoards } from "./landing-order";

describe("orderLandingStandingsBoards", () => {
  it("puts years with revealed scores ahead of unrevealed years", () => {
    const ordered = orderLandingStandingsBoards([
      { year: 2026, detailedStatsRevealed: false },
      { year: 2025, detailedStatsRevealed: true },
      { year: 2024, detailedStatsRevealed: true },
    ]);
    expect(ordered.map((row) => row.year)).toEqual([2025, 2024, 2026]);
  });
});
