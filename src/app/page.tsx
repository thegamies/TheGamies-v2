import Link from "next/link";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import {
  getGotyThroughRankForYears,
  TOP_STANDINGS_RANK,
} from "@/lib/live-aggregate/service";
import { getLandingStandingsYears } from "@/lib/site-settings/service";

export default async function HomePage() {
  let years: number[] = [];
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
    years = await getLandingStandingsYears();
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
    years = [];
    sections = [];
  }

  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-16 sm:py-20">
      <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
        The Gamies
      </p>
      <h1 className="mt-4 font-display text-6xl leading-none tracking-wide text-ink sm:text-8xl">
        Editorial Standings
      </h1>
      <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-muted">
        Community awards, Hosts, and ranked lists — rebuilt with a restrained
        soft-brutal design system.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/standings"
          className="rounded-[var(--radius-control)] bg-accent px-5 py-3 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
        >
          View all years
        </Link>
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
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Live GOTY
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
              Top {TOP_STANDINGS_RANK}
            </h2>
            <p className="mt-2 max-w-xl text-muted">
              {years.length > 0
                ? `Site standings for ${years.join(" · ")}.`
                : "Site standings from signed-in lists."}
            </p>
          </div>
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
