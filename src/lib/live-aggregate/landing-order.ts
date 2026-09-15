export function orderLandingStandingsBoards<T extends { year: number }>(
  boards: readonly T[],
): T[] {
  return [...boards].sort((a, b) => b.year - a.year);
}
