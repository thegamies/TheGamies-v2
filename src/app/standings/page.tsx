import type { Metadata } from "next";
import Link from "next/link";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import {
  getGotyThroughRankForYears,
  listYearsWithGotyScores,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";

export const metadata: Metadata = {
  title: "Standings",
  description: "Game of the Year top five for every year with live standings.",
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
  }> = [];
  let error: string | null = null;

  try {
    const years = await listYearsWithGotyScores();
    const boards = await getGotyThroughRankForYears(years, {
      maxRank: TOP_STANDINGS_RANK,
    });
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
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-8 sm:py-10">
      <h1 className="font-display text-5xl tracking-wide text-ink md:text-7xl">
        Standings
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        Top {TOP_STANDINGS_RANK} for every year with site standings. Open a year
        for the full board.
      </p>

      {error ? (
        <p className="mt-8 text-muted">Standings could not be loaded right now.</p>
      ) : sections.length === 0 ? (
        <p className="mt-8 text-muted">
          No standings yet.{" "}
          <Link href="/create" className="text-ink underline">
            Build a Game of the Year list
          </Link>{" "}
          to get on the board.
        </p>
      ) : (
        <div className="mt-6">
          <YearTopFiveSections sections={sections} />
        </div>
      )}
    </main>
  );
}
