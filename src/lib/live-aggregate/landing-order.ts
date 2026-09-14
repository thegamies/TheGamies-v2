export function orderLandingStandingsBoards<
  T extends { detailedStatsRevealed: boolean; year: number },
>(boards: readonly T[]): T[] {
  return [...boards].sort((a, b) => {
    if (a.detailedStatsRevealed !== b.detailedStatsRevealed) {
      return a.detailedStatsRevealed ? -1 : 1;
    }
    return b.year - a.year;
  });
}
