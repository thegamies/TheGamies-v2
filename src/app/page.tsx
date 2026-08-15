import Link from "next/link";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import {
  getGotyThroughRankForYears,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import { getLandingStandingsYears } from "@/lib/site-settings/service";

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
  }> = [];

  try {
    const years = await getLandingStandingsYears();
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
  } catch {
    sections = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-16 sm:py-20">
      <h1 className="font-display text-6xl leading-none tracking-wide text-ink sm:text-8xl">
        The Gamies
      </h1>
      <p className="mt-5 max-w-md font-serif text-lg leading-relaxed text-muted">
        Personal GOTY lists and community awards.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/games"
          className="rounded-[var(--radius-control)] border border-line px-5 py-3 text-sm tracking-wide text-ink transition-colors hover:border-accent"
        >
          Browse games
        </Link>
        <Link
          href="/communities"
          className="rounded-[var(--radius-control)] border border-line px-5 py-3 text-sm tracking-wide text-ink transition-colors hover:border-accent"
        >
          Communities
        </Link>
      </div>

      <section className="mt-16 border-t border-line pt-12 sm:mt-20 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
            Game of the Year
          </h2>
          <Link
            href="/standings"
            className="text-sm text-accent hover:underline"
          >
            View all years
          </Link>
        </div>

        <YearTopFiveSections sections={sections} />
      </section>
    </main>
  );
}
