import { GameGotyRankingsGallery } from "@/components/games/GameGotyRankings";
import type { GameGotyRankings as GameGotyRankingsData } from "@/lib/live-aggregate/game-rankings";

const FIXTURE_STATS: GameGotyRankingsData = {
  byYear: [
    {
      year: 2026,
      rank: 1,
      votes: 109,
      score: 645,
      votesByRank: [16, 11, 12, 8, 12, 14, 6, 14, 10, 6],
      detailedStatsRevealed: true,
    },
  ],
  viaParent: null,
};

export function GameGotyRankingsFixture() {
  return (
    <GameGotyRankingsGallery stats={FIXTURE_STATS} />
  );
}
