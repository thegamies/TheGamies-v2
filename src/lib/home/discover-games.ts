import { browseGames } from "@/lib/catalog";
import { listTrendingBoard } from "@/lib/activity/query";

export type HomeDiscoverGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

/** Covers shipped on `/` trending and upcoming strips. SQL-capped. */
export const HOME_DISCOVER_CAP = 12;

function toDiscover(row: {
  gameId?: string;
  id?: string;
  slug: string;
  title: string;
  coverUrl: string | null;
}): HomeDiscoverGame {
  return {
    gameId: row.gameId ?? row.id ?? "",
    slug: row.slug,
    title: row.title,
    coverUrl: row.coverUrl,
  };
}

/**
 * Site trending, same board and floor as `/games?sort=trending`.
 * Renders a short first page; does not dump the window.
 */
export async function listHomeTrendingGames(opts: {
  minPeople?: number;
} = {}): Promise<HomeDiscoverGame[]> {
  const board = await listTrendingBoard({
    applySiteFloor: true,
    minPeople: opts.minPeople,
    page: 1,
  }).catch(() => null);
  if (!board?.publicReady) return [];
  return board.rows.slice(0, HOME_DISCOVER_CAP).map((row) =>
    toDiscover({
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
    }),
  );
}

/**
 * Upcoming titles: GOTY-eligible, no editions, dated in the next six months.
 * SQL picks the most popular page; that page is then ordered soonest first.
 */
export async function listHomeUpcomingGames(): Promise<HomeDiscoverGame[]> {
  const rows = await browseGames({
    releaseStatus: "upcoming",
    sort: "popularity",
    sortDir: "desc",
    excludeEditions: true,
    gotyEligibleTypes: true,
    limit: HOME_DISCOVER_CAP,
    offset: 0,
  }).catch(() => []);
  return rows
    .filter((row) => row.coverUrl)
    .sort((a, b) => {
      const aTime = a.firstReleaseDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.firstReleaseDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    })
    .map((row) =>
      toDiscover({
        id: row.id,
        slug: row.slug,
        title: row.title,
        coverUrl: row.coverUrl,
      }),
    );
}
