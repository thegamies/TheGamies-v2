import type { Metadata } from "next";
import Link from "next/link";
import { RankingsInfoControl } from "@/components/standings/RankingsInfoControl";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import { YearSelect } from "@/components/ui/YearSelect";
import {
  getCategoryHighlightsForYears,
  type CategoryHighlightWinner,
} from "@/lib/live-aggregate/category-highlights";
import {
  getGotyThroughRankForYears,
  listPublicStandingsYears,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import { gotyCreatorCta, type GotyCreatorCta } from "@/lib/lists/existing-goty";
import { loadGotyCreatorCtas } from "@/lib/lists/load-goty-creator-cta";
import { publicPageMetadata } from "@/lib/seo/site";
import { getStandingFillMinVisible } from "@/lib/site-settings/service";
import { DEFAULT_STANDING_FILL_MIN_VISIBLE } from "@/lib/standings/standing-fill";

export const metadata: Metadata = publicPageMetadata({
  title: "Game of the Year",
  description:
    "Game of the Year rankings and category winners for every public year.",
  path: "/game-of-the-year",
});

export default async function GameOfTheYearLandingPage() {
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
    creatorCta?: GotyCreatorCta;
  }> = [];
  let error: string | null = null;
  let minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;

  try {
    minVisible = await getStandingFillMinVisible();
  } catch {
    minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE;
  }

  try {
    const years = await listPublicStandingsYears();
    const [boards, highlights, creatorCtas] = await Promise.all([
      getGotyThroughRankForYears(years, {
        maxRank: TOP_STANDINGS_RANK,
      }),
      getCategoryHighlightsForYears(years),
      loadGotyCreatorCtas(years).catch(() => new Map<number, GotyCreatorCta>()),
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
      creatorCta:
        creatorCtas.get(board.year) ?? gotyCreatorCta(board.year, null),
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)] sm:py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <h1 className="min-w-0 text-pretty font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
            Game of the Year
          </h1>
          <div className="flex h-[1em] shrink-0 items-center text-5xl md:text-7xl">
            <RankingsInfoControl />
          </div>
        </div>
        {sections.length > 0 ? (
          <div className="flex h-[1em] shrink-0 items-center text-5xl md:text-7xl">
            <div className="text-base leading-none">
              <YearSelect
                options={sections.map((section) => ({
                  year: section.year,
                  href: `/game-of-the-year/${section.year}`,
                }))}
                label="All"
                triggerLabel="All"
              />
            </div>
          </div>
        ) : null}
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
