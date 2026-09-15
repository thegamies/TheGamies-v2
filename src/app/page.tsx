import {
  HomeBigPictureBanner,
  type HomeBigPictureGame,
} from "@/components/home/HomeBigPictureBanner";
import { HomeCoverStrip } from "@/components/home/HomeCoverStrip";
import {
  HomeCommunitiesIntro,
  HomeGotyIntro,
  HomeWhatIs,
} from "@/components/home/HomePitch";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import { listHomeBigPictureGames } from "@/lib/home/big-picture-games";
import {
  listHomeTrendingGames,
  listHomeUpcomingGames,
  type HomeDiscoverGame,
} from "@/lib/home/discover-games";
import { getCategoryHighlightsForYears } from "@/lib/live-aggregate/category-highlights";
import { orderLandingStandingsBoards } from "@/lib/live-aggregate/landing-order";
import {
  filterYearsWithPublicGoty,
  getGotyThroughRankForYears,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import { gotyCreatorCta, type GotyCreatorCta } from "@/lib/lists/existing-goty";
import { loadGotyCreatorCtas } from "@/lib/lists/load-goty-creator-cta";
import {
  getSiteSettings,
  resolveLandingStandingsYears,
} from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";
import { SiteAds } from "@/components/ads/AdsLayout";
import { adsenseAccountMetadata } from "@/lib/ads/adsense";
import { gamesBrowseHref, trendingHref } from "@/lib/activity/paths";
import { getRequestSessionUser } from "@/lib/auth/session";
import { publicPageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import { PromoBanner } from "@/components/promo/PromoBanner";
import { tgaPromoCopy } from "@/lib/tga-pickem/promo";
import { getPromotedTgaYear } from "@/lib/tga-pickem/service";
import type { TgaYearSchedule } from "@/lib/tga-pickem/status";

export const metadata = {
  ...publicPageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  ...adsenseAccountMetadata(),
  title: { absolute: SITE_NAME },
};

type HomeYearSection = {
  year: number;
  rows: Array<{
    place: number;
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    score: number | null;
  }>;
  yearHref: string;
  categoryWinners?: Array<{
    categoryId: string;
    label: string;
    games: Array<{
      gameId: string;
      slug: string;
      title: string;
      coverUrl: string | null;
    }>;
  }>;
  creatorCta?: GotyCreatorCta;
};

export default async function HomePage() {
  let sections: HomeYearSection[] = [];
  let minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  let bigPictureGames: HomeBigPictureGame[] = [];
  let trendingGames: HomeDiscoverGame[] = [];
  let upcomingGames: HomeDiscoverGame[] = [];
  let tgaBand: (TgaYearSchedule & { year: number }) | null = null;
  const sessionUser = await getRequestSessionUser();
  const signedIn = Boolean(sessionUser?.id);
  const listYear = new Date().getUTCFullYear();

  try {
    const settings = await getSiteSettings();
    minVisible = settings.standingFillMinVisible;
    const years = await filterYearsWithPublicGoty(
      resolveLandingStandingsYears(settings.landingStandingsYears),
    );
    const [boards, highlights, popular, creatorCtas, promotedTga, trending, upcoming] =
      await Promise.all([
        getGotyThroughRankForYears(years, {
          maxRank: TOP_STANDINGS_RANK,
        }),
        getCategoryHighlightsForYears(years),
        listHomeBigPictureGames(),
        loadGotyCreatorCtas([...years, listYear]).catch(
          () => new Map<number, GotyCreatorCta>(),
        ),
        getPromotedTgaYear().catch(() => null),
        listHomeTrendingGames({
          minPeople: settings.publicTrendingMinPeople,
        }),
        listHomeUpcomingGames(),
      ]);
    if (promotedTga) {
      tgaBand = {
        year: promotedTga.year,
        enabled: promotedTga.enabled,
        opensAt: promotedTga.opensAt,
        showStartsAt: promotedTga.showStartsAt,
      };
    }
    bigPictureGames = popular;
    trendingGames = trending;
    upcomingGames = upcoming;
    const winnersByYear = new Map(
      highlights.map((block) => [block.year, block.winners]),
    );
    sections = orderLandingStandingsBoards(boards).map((board) => ({
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
      creatorCta:
        creatorCtas.get(board.year) ?? gotyCreatorCta(board.year, null),
    }));
  } catch {
    sections = [];
    try {
      const [popular, trending, upcoming] = await Promise.all([
        listHomeBigPictureGames(),
        listHomeTrendingGames(),
        listHomeUpcomingGames(),
      ]);
      bigPictureGames = popular;
      trendingGames = trending;
      upcomingGames = upcoming;
    } catch {
      bigPictureGames = [];
    }
  }

  if (!tgaBand) {
    const promotedTga = await getPromotedTgaYear().catch(() => null);
    if (promotedTga) {
      tgaBand = {
        year: promotedTga.year,
        enabled: promotedTga.enabled,
        opensAt: promotedTga.opensAt,
        showStartsAt: promotedTga.showStartsAt,
      };
    }
  }

  const featuredYear = sections[0] ?? null;
  const laterYears = sections.slice(1);

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] pb-6 pt-0 sm:pb-8">
      <SiteAds />
      <HomeBigPictureBanner games={bigPictureGames} />
      {featuredYear ? (
        <section className="pt-5 sm:pt-6 pb-4 sm:pb-6">
          <YearTopFiveSections
            sections={[featuredYear]}
            minVisible={minVisible}
            showHeader={false}
            showCategories={signedIn}
            gotyHeading
            empty={null}
          />
        </section>
      ) : null}
      {signedIn ? null : <HomeWhatIs />}
      {signedIn ? null : (
        <HomeGotyIntro
          resultsHref={featuredYear?.yearHref ?? "/game-of-the-year"}
          resultsCategoriesHref={
            featuredYear
              ? `${featuredYear.yearHref}/categories`
              : "/game-of-the-year"
          }
        />
      )}
      {signedIn ? null : <HomeCommunitiesIntro />}
      {tgaBand ? (
        <section className="border-b border-line py-6 sm:py-8">
          <PromoBanner
            kind="tga"
            year={tgaBand.year}
            href={`/the-game-awards/${tgaBand.year}`}
            {...tgaPromoCopy(tgaBand)}
          />
        </section>
      ) : null}

      <section className="pt-2 sm:pt-4">
        <HomeCoverStrip
          title="Trending"
          moreHref={trendingHref()}
          games={trendingGames}
          empty="No trending games yet."
          label="Trending games"
        />
        <HomeCoverStrip
          title="Upcoming"
          moreHref={gamesBrowseHref({ releaseStatus: "upcoming" })}
          games={upcomingGames}
          empty="No upcoming titles in the catalog yet."
          label="Upcoming games"
        />
      </section>

      {laterYears.length > 0 ? (
        <section className="pt-8 sm:pt-10">
          <YearTopFiveSections
            sections={laterYears}
            minVisible={minVisible}
            showHeader={false}
            empty={null}
          />
        </section>
      ) : null}
    </main>
  );
}
