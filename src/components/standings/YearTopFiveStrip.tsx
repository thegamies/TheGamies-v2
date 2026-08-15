"use client";

import Link from "next/link";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";

export type YearTopFiveRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  score: number | null;
};

/** Same chrome as `Button` bordered / sm — for Next `Link` CTAs. */
const outlinedLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-line px-3 text-xs font-semibold tracking-wide text-ink transition-colors hover:border-accent";

/**
 * One year of Top 5 — community event Comparison strip language.
 * Year + Standings share a ruled header bar; covers sit tight under it.
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
    <article className={showRule ? "mt-5 sm:mt-6" : undefined}>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
        <h3 className="font-display text-2xl leading-none tracking-wide text-ink sm:text-3xl">
          {year}
        </h3>
        <Link href={yearHref} className={outlinedLinkClass}>
          Standings
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No rankings for this year yet.</p>
      ) : (
        <HorizontalScroll className="mt-2" label={`${year} top five`}>
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
  allYearsHref?: string | null;
}) {
  if (sections.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">No standings years to show yet.</p>
    );
  }

  return (
    <div>
      {allYearsHref ? (
        <div className="mb-3 flex items-end justify-between gap-4 border-b border-line pb-2 sm:mb-4">
          <h2 className="font-display text-4xl leading-none tracking-wide text-ink sm:text-5xl">
            Game of the Year
          </h2>
          <Link href={allYearsHref} className={outlinedLinkClass}>
            All years
          </Link>
        </div>
      ) : null}
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
  );
}
