import { and, eq } from "drizzle-orm";
import { createDb, tgaYears } from "@thegamies/db";
import type { HomeBigPictureGame } from "@/components/home/HomeBigPictureBanner";
import { listHomeBigPictureGames } from "@/lib/home/big-picture-games";
import {
  listHomeTrendingGames,
  listHomeUpcomingGames,
  type HomeDiscoverGame,
} from "@/lib/home/discover-games";
import {
  getCategoryHighlightsForYears,
  type CategoryHighlightWinner,
} from "@/lib/live-aggregate/category-highlights";
import { orderLandingStandingsBoards } from "@/lib/live-aggregate/landing-order";
import {
  filterYearsWithPublicGoty,
  getGotyThroughRankForYears,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import {
  getSiteSettings,
  resolveLandingStandingsYears,
} from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";
import {
  matchHomePublic,
  putHomePublic,
  reviveHomePublic,
  storeHomePublicTga,
  type HomePublicCacheValue,
  type HomePublicPayload,
  type HomePublicRow,
  type HomePublicTga,
} from "@/lib/home/home-public-cache";

export type HomePublicDeps = {
  getSiteSettings: () => Promise<{
    standingFillMinVisible: number;
    landingStandingsYears: number[] | null;
    publicTrendingMinPeople: number;
  }>;
  listHomeBigPictureGames: () => Promise<HomeBigPictureGame[]>;
  listHomeUpcomingGames: () => Promise<HomeDiscoverGame[]>;
  listHomeTrendingGames: (opts: {
    minPeople?: number;
  }) => Promise<HomeDiscoverGame[]>;
  filterYearsWithPublicGoty: (years: number[]) => Promise<number[]>;
  getGotyThroughRankForYears: (years: number[]) => Promise<
    Array<{
      year: number;
      rows: HomePublicRow[];
    }>
  >;
  getCategoryHighlightsForYears: (
    years: number[],
  ) => Promise<Array<{ year: number; winners: CategoryHighlightWinner[] }>>;
  readPromotedTgaSchedule: () => Promise<HomePublicTga | null>;
};

/**
 * Promoted Pick’em year for the homepage banner.
 * Schedule columns only — the slate completeness check stays off this path.
 */
export async function readPromotedTgaSchedule(): Promise<HomePublicTga | null> {
  const [row] = await createDb()
    .select({
      year: tgaYears.year,
      enabled: tgaYears.enabled,
      opensAt: tgaYears.opensAt,
      showStartsAt: tgaYears.showStartsAt,
    })
    .from(tgaYears)
    .where(and(eq(tgaYears.enabled, true), eq(tgaYears.promoted, true)))
    .limit(1);
  if (!row) return null;
  return {
    year: row.year,
    enabled: row.enabled,
    opensAt: row.opensAt,
    showStartsAt: row.showStartsAt,
  };
}

function defaultHomePublicDeps(): HomePublicDeps {
  return {
    getSiteSettings,
    listHomeBigPictureGames,
    listHomeUpcomingGames,
    listHomeTrendingGames,
    filterYearsWithPublicGoty,
    getGotyThroughRankForYears: (years) =>
      getGotyThroughRankForYears(years, { maxRank: TOP_STANDINGS_RANK }),
    getCategoryHighlightsForYears,
    readPromotedTgaSchedule,
  };
}

function emptyPayload(): HomePublicPayload {
  return {
    minVisible: DEFAULT_STANDING_FILL_MIN_VISIBLE,
    years: [],
    sections: [],
    bigPictureGames: [],
    trendingGames: [],
    upcomingGames: [],
    tga: null,
    standingsReady: false,
  };
}

/**
 * Public homepage payload. Cache hit skips the database.
 * Standings failure stays uncached; covers from the first wave still return.
 */
export async function loadHomePublic(
  deps: HomePublicDeps = defaultHomePublicDeps(),
): Promise<HomePublicPayload> {
  const hit = await matchHomePublic();
  if (hit) return hit;

  const partial = emptyPayload();
  let haveWave1 = false;
  let haveTrending = false;

  try {
    const [settings, bigPictureGames, upcomingGames, tga] = await Promise.all([
      deps.getSiteSettings(),
      deps.listHomeBigPictureGames(),
      deps.listHomeUpcomingGames(),
      deps.readPromotedTgaSchedule(),
    ]);
    haveWave1 = true;
    partial.minVisible = settings.standingFillMinVisible;
    partial.bigPictureGames = bigPictureGames;
    partial.upcomingGames = upcomingGames;
    partial.tga = tga;

    const [years, trendingGames] = await Promise.all([
      deps.filterYearsWithPublicGoty(
        resolveLandingStandingsYears(settings.landingStandingsYears),
      ),
      deps.listHomeTrendingGames({
        minPeople: settings.publicTrendingMinPeople,
      }),
    ]);
    haveTrending = true;
    partial.years = years;
    partial.trendingGames = trendingGames;

    const [boards, highlights] = await Promise.all([
      deps.getGotyThroughRankForYears(years),
      deps.getCategoryHighlightsForYears(years),
    ]);
    const winnersByYear = new Map(
      highlights.map((block) => [block.year, block.winners]),
    );
    const stored: HomePublicCacheValue = {
      minVisible: settings.standingFillMinVisible,
      years,
      sections: orderLandingStandingsBoards(boards).map((board) => ({
        year: board.year,
        yearHref: `/game-of-the-year/${board.year}`,
        rows: board.rows.map((row) => ({
          place: row.place,
          gameId: row.gameId,
          slug: row.slug,
          title: row.title,
          coverUrl: row.coverUrl,
          score: row.score,
        })),
        categoryWinners: winnersByYear.get(board.year) ?? [],
      })),
      bigPictureGames,
      trendingGames,
      upcomingGames,
      tga: storeHomePublicTga(tga),
    };
    await putHomePublic(stored);
    return reviveHomePublic(stored);
  } catch {
    if (!haveWave1) {
      try {
        const [popular, trending, upcoming] = await Promise.all([
          deps.listHomeBigPictureGames(),
          deps.listHomeTrendingGames({}),
          deps.listHomeUpcomingGames(),
        ]);
        partial.bigPictureGames = popular;
        partial.trendingGames = trending;
        partial.upcomingGames = upcoming;
      } catch {
        partial.bigPictureGames = [];
      }
      partial.tga = await deps.readPromotedTgaSchedule().catch(() => null);
    } else if (!haveTrending) {
      partial.trendingGames = await deps
        .listHomeTrendingGames({})
        .catch(() => []);
    }
    return partial;
  }
}
