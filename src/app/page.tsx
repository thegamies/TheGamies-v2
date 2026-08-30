import {
  HomeBigPictureBanner,
  type HomeBigPictureGame,
} from "@/components/home/HomeBigPictureBanner";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import { listHomeBigPictureGames } from "@/lib/home/big-picture-games";
import { getCategoryHighlightsForYears } from "@/lib/live-aggregate/category-highlights";
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
  title: { absolute: SITE_NAME },
};

export default async function HomePage() {
  let sections: Array<{
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
  }> = [];
  let minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  let bigPictureGames: HomeBigPictureGame[] = [];
  let tgaBand: (TgaYearSchedule & { year: number }) | null = null;

  try {
    const settings = await getSiteSettings();
    minVisible = settings.standingFillMinVisible;
    const years = await filterYearsWithPublicGoty(
      resolveLandingStandingsYears(settings.landingStandingsYears),
    );
    const [boards, highlights, popular, creatorCtas, promotedTga] =
      await Promise.all([
        getGotyThroughRankForYears(years, {
          maxRank: TOP_STANDINGS_RANK,
        }),
        getCategoryHighlightsForYears(years),
        listHomeBigPictureGames(),
        loadGotyCreatorCtas(years).catch(() => new Map<number, GotyCreatorCta>()),
        getPromotedTgaYear().catch(() => null),
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
    const winnersByYear = new Map(
      highlights.map((block) => [block.year, block.winners]),
    );
    sections = boards.map((board) => ({
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
      bigPictureGames = await listHomeBigPictureGames();
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

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] pb-6 pt-0 sm:pb-8">
      <HomeBigPictureBanner games={bigPictureGames} />
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

      <section className="pt-6 sm:pt-8">
        <YearTopFiveSections
          sections={sections}
          allYearsHref="/game-of-the-year"
          minVisible={minVisible}
        />
      </section>
    </main>
  );
}
