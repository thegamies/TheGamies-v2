import { cache } from "react";
import {
  getGameDetailCategoryWins,
  getGameDetailGotyRankings,
  type GameCategoryWin,
  type GameGotyRankings,
} from "@/lib/live-aggregate/game-rankings";
import { getGameBySlug } from "@/lib/catalog";

export type GamePageData = {
  game: NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;
  rankings: GameGotyRankings;
  categoryWins: GameCategoryWin[];
};

export const getGamePageData = cache(
  async (slug: string): Promise<GamePageData | null> => {
    const game = await getGameBySlug(slug);
    if (!game) return null;
    const [rankings, awards] = await Promise.all([
      getGameDetailGotyRankings(game).catch(
        (): GameGotyRankings => ({ byYear: [], viaParent: null }),
      ),
      getGameDetailCategoryWins(game).catch(
        () => ({ wins: [] as GameCategoryWin[], viaParent: null }),
      ),
    ]);
    return {
      game,
      rankings,
      categoryWins: awards.wins,
    };
  },
);
