"use client";

import Link from "next/link";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";

export type YearTopFiveRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  score: number | null;
};

/**
 * One year of Top 5 — community event Comparison strip language:
 * horizontal scroll when mobile or ties push past the viewport.
 * The year mark itself opens the full board (no floating side link).
 */
export function YearTopFiveStrip({
  year,
  rows,
  yearHref,
  showRule = false,
}: {
  year: number;
  rows: YearTopFiveRow[];
  yearHref: string;
  showRule?: boolean;
}) {
  return (
    <article>
      {showRule ? <SectionRule className="mb-3" /> : null}
      <h3 className="font-display text-2xl leading-none tracking-wide sm:text-3xl">
        <Link
          href={yearHref}
          className="text-ink transition-colors hover:text-accent"
        >
          {year}
        </Link>
      </h3>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No rankings for this year yet.</p>
      ) : (
        <HorizontalScroll className="mt-4" label={`${year} top five`}>
          <ul className="flex w-max min-w-full flex-nowrap items-end gap-4">
            {rows.map((row) => (
              <li
                key={row.gameId}
                className={
                  row.place === 1
                    ? "w-[168px] shrink-0 sm:w-[190px]"
                    : "w-[132px] shrink-0 sm:w-[148px]"
                }
              >
                <StandingGameCard
                  place={row.place}
                  placeSize="lg"
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  points={row.score}
                  priority={row.place === 1}
                />
              </li>
            ))}
          </ul>
        </HorizontalScroll>
      )}
    </article>
  );
}

export function YearTopFiveSections({
  sections,
  allYearsHref,
}: {
  sections: Array<{
    year: number;
    rows: YearTopFiveRow[];
    yearHref: string;
  }>;
  /** Quiet footer link under the year strips (homepage → /standings). */
  allYearsHref?: string | null;
}) {
  if (sections.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No standings years to show yet.</p>
    );
  }

  return (
    <div className="mt-6">
      <div className="space-y-8 sm:space-y-10">
        {sections.map((section, index) => (
          <YearTopFiveStrip
            key={section.year}
            year={section.year}
            rows={section.rows}
            yearHref={section.yearHref}
            showRule={index > 0}
          />
        ))}
      </div>
      {allYearsHref ? (
        <p className="mt-10 border-t border-line pt-6">
          <Link
            href={allYearsHref}
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            All years
          </Link>
        </p>
      ) : null}
    </div>
  );
}
