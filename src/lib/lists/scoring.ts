/** Default live/edition scoring: top 10 only. Ranks beyond 10 score 0. */
export function pointsForRank(rank: number): number {
  if (!Number.isInteger(rank) || rank < 1) return 0;
  if (rank > 10) return 0;
  return 11 - rank;
}
