import { cache } from "react";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";
import {
  getGameDetailCategoryWins,
  getGameDetailGotyRankings,
  hasGameGotyPresence,
  type GameCategoryWin,
  type GameGotyRankings,
} from "@/lib/live-aggregate/game-rankings";
import { getGameBySlug } from "@/lib/catalog";
import {
  gameHasPublicSiteValueFromSignals,
  needsPublicListAdsProbe,
} from "./game-public-value-signals";

export type GamePageData = {
  game: NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;
  rankings: GameGotyRankings;
  categoryWins: GameCategoryWin[];
  hasPublicSiteValue: boolean;
};

function getDb(): Db {
  return createDb();
}

/** Ads / index signal only: stop after one public owned list. */
export async function gameAppearsOnPublicList(
  gameId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const result = await db.execute(sql`
    select 1 as ok
    from list_items li
    inner join lists l on l.id = li.list_id
    inner join profiles p on p.id = l.profile_id
    where li.game_id = ${gameId}
      and l.rank_visibility is distinct from 'hidden'
      and p.visibility = 'public'
      and p.deleted_at is null
      and p.is_seed = false
    limit 1
  `);
  return result.rows.length > 0;
}

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
    const categoryWinCount = awards.wins.filter((win) => win.place === 1).length;
    const hasGotyPresence = hasGameGotyPresence(rankings);
    const onPublicList = needsPublicListAdsProbe({
      hasGotyPresence,
      categoryWinCount,
    })
      ? await gameAppearsOnPublicList(game.id).catch(() => false)
      : false;
    return {
      game,
      rankings,
      categoryWins: awards.wins,
      hasPublicSiteValue: gameHasPublicSiteValueFromSignals({
        hasGotyPresence,
        categoryWinCount,
        publicListCount: onPublicList ? 1 : 0,
      }),
    };
  },
);
