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
import {
  getSiteSettings,
  resolveLandingStandingsYears,
} from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";

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
  }> = [];
  let minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  let bigPictureGames: HomeBigPictureGame[] = [];

  try {
    const settings = await getSiteSettings();
    minVisible = settings.standingFillMinVisible;
    const years = await filterYearsWithPublicGoty(
      resolveLandingStandingsYears(settings.landingStandingsYears),
    );
    const [boards, highlights, popular] = await Promise.all([
      getGotyThroughRankForYears(years, {
        maxRank: TOP_STANDINGS_RANK,
      }),
      getCategoryHighlightsForYears(years),
      listHomeBigPictureGames(),
    ]);
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
    }));
  } catch {
    sections = [];
    try {
      bigPictureGames = await listHomeBigPictureGames();
    } catch {
      bigPictureGames = [];
    }
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] pb-6 pt-0 sm:pb-8">
      <HomeBigPictureBanner games={bigPictureGames} />

      <section className="pt-6 sm:pt-8">
        <YearTopFiveSections
          sections={sections}
          allYearsHref="/standings"
          minVisible={minVisible}
        />
      </section>
    </main>
  );
}
