import Link from "next/link";
import { YearTopFiveSections } from "@/components/standings/YearTopFiveStrip";
import { SectionRule } from "@/components/ui/SectionRule";
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
    <main className="mx-auto w-full max-w-[var(--page-max)] flex-1 px-[var(--gutter)] py-6 sm:py-8">
      <p className="max-w-lg font-serif text-xl leading-snug text-muted sm:text-2xl">
        Personal Game of the Year lists and community awards.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
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

      <SectionRule className="mt-8 sm:mt-10" />

      <section className="pt-4 sm:pt-5">
        <YearTopFiveSections sections={sections} allYearsHref="/standings" />
      </section>
    </main>
  );
}
