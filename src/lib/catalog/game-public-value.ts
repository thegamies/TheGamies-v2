import { cache } from "react";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";
import { listSharePath } from "@/lib/lists/urls";
import {
  getGameDetailCategoryWins,
  getGameDetailGotyRankings,
  hasGameGotyPresence,
  type GameCategoryWin,
  type GameGotyRankings,
} from "@/lib/live-aggregate/game-rankings";
import { getGameBySlug } from "@/lib/catalog";
import { gameHasPublicSiteValueFromSignals } from "./game-public-value-signals";

/** Public lists shown on a game page — capped; never dump the full roster. */
export const GAME_PUBLIC_LISTS_CAP = 8;

export type GamePublicListRef = {
  href: string;
  title: string;
  ownerName: string;
  rank: number | null;
  year: number | null;
};

export type GamePageData = {
  game: NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;
  rankings: GameGotyRankings;
  categoryWins: GameCategoryWin[];
  publicLists: GamePublicListRef[];
  hasPublicSiteValue: boolean;
};

function getDb(): Db {
  return createDb();
}

function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function listPublicListsForGame(
  gameId: string,
  db: Db = getDb(),
): Promise<GamePublicListRef[]> {
  const result = await db.execute(sql`
    select
      l.public_id as "publicId",
      l.slug,
      l.title,
      l.year,
      l.rank_visibility as "rankVisibility",
      p.username,
      p.display_name as "displayName",
      li.rank
    from list_items li
    inner join lists l on l.id = li.list_id
    inner join profiles p on p.id = l.profile_id
    where li.game_id = ${gameId}
      and l.rank_visibility is distinct from 'hidden'
      and p.visibility = 'public'
      and p.deleted_at is null
      and p.is_seed = false
    order by l.updated_at desc, l.id desc
    limit ${GAME_PUBLIC_LISTS_CAP}
  `);

  return (
    result.rows as Array<{
      publicId: unknown;
      slug: unknown;
      title: unknown;
      year: unknown;
      rankVisibility: unknown;
      username: unknown;
      displayName: unknown;
      rank: unknown;
    }>
  )
    .map((row) => {
      const publicId = typeof row.publicId === "string" ? row.publicId : null;
      const username = typeof row.username === "string" ? row.username : null;
      if (!publicId || !username) return null;
      const slug = typeof row.slug === "string" ? row.slug : null;
      const hideRank = row.rankVisibility === "games_only";
      return {
        href: listSharePath({ publicId, slug, username }),
        title: typeof row.title === "string" ? row.title : "List",
        ownerName:
          typeof row.displayName === "string" ? row.displayName : username,
        rank: hideRank ? null : asInt(row.rank, 0) || null,
        year: row.year == null ? null : asInt(row.year),
      };
    })
    .filter((row): row is GamePublicListRef => Boolean(row));
}

export const getGamePageData = cache(
  async (slug: string): Promise<GamePageData | null> => {
    const game = await getGameBySlug(slug);
    if (!game) return null;
    const [rankings, awards, publicLists] = await Promise.all([
      getGameDetailGotyRankings(game).catch(
        (): GameGotyRankings => ({ byYear: [], viaParent: null }),
      ),
      getGameDetailCategoryWins(game).catch(
        () => ({ wins: [] as GameCategoryWin[], viaParent: null }),
      ),
      listPublicListsForGame(game.id).catch(() => [] as GamePublicListRef[]),
    ]);
    return {
      game,
      rankings,
      categoryWins: awards.wins,
      publicLists,
      hasPublicSiteValue: gameHasPublicSiteValueFromSignals({
        hasGotyPresence: hasGameGotyPresence(rankings),
        categoryWinCount: awards.wins.length,
        publicListCount: publicLists.length,
      }),
    };
  },
);
