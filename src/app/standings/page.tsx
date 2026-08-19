import type { Metadata } from "next";
import Link from "next/link";
import { RankingsInfoControl } from "@/components/standings/RankingsInfoControl";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import {
  getCategoryHighlightsForYears,
  type CategoryHighlightWinner,
} from "@/lib/live-aggregate/category-highlights";
import {
  getGotyThroughRankForYears,
  listYearsWithGotyScores,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import { getStandingFillMinVisible } from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";

export const metadata: Metadata = {
  title: "Game of the Year",
  description: "Game of the Year rankings and category winners for every public year.",
};

export default async function StandingsLandingPage() {
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
    categoryWinners: CategoryHighlightWinner[];
  }> = [];
  let error: string | null = null;
  let minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;

  try {
    minVisible = await getStandingFillMinVisible();
  } catch {
    minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  }

  try {
    const years = await listYearsWithGotyScores();
    const [boards, highlights] = await Promise.all([
      getGotyThroughRankForYears(years, {
        maxRank: TOP_STANDINGS_RANK,
      }),
      getCategoryHighlightsForYears(years),
    ]);
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
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-8 sm:py-10">
      <div className="flex items-start gap-3">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
          Game of the Year
        </h1>
        <RankingsInfoControl className="mt-2 md:mt-4" />
      </div>

      {error ? (
        <p className="mt-8 text-muted">Rankings could not be loaded right now.</p>
      ) : sections.length === 0 ? (
        <p className="mt-8 text-muted">
          No rankings yet.{" "}
          <Link href="/create" className="text-ink underline">
            Build a Game of the Year list
          </Link>{" "}
          to get on the board.
        </p>
      ) : (
        <div className="mt-6">
          <YearTopFiveSections
            sections={sections}
            minVisible={minVisible}
          />
        </div>
      )}
    </main>
  );
}
