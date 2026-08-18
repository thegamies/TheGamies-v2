"use client";

import Link from "next/link";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import {
  StandingGameCard,
  standingFillFiveColClass,
  standingFillFiveFlowClass,
  standingFillFiveListClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import type { CategoryHighlightWinner } from "@/lib/live-aggregate/category-highlights";

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

const fillFiveColClass = standingFillFiveColClass();

/**
 * One year of Top 5. Year + Full rankings share a ruled header bar.
 * Five equal cards fill the row; extra ties stay on one row and scroll.
 */
export function YearTopFiveStrip({
  year,
  rows,
  yearHref,
  categoryWinners = [],
  showRule = false,
}: {
  year: number;
  rows: YearTopFiveRow[];
  yearHref: string;
  categoryWinners?: CategoryHighlightWinner[];
  showRule?: boolean;
}) {
  const categoriesHref = `/game-of-the-year/${year}?view=categories`;

  return (
    <article className={showRule ? "mt-5 sm:mt-6" : undefined}>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
        <h3 className="font-display text-2xl leading-none tracking-wide text-ink sm:text-3xl">
          {year}
        </h3>
        <Link href={yearHref} className={outlinedLinkClass}>
          Full rankings
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No rankings for this year yet.</p>
      ) : (
        <HorizontalScroll className="@container mt-2" label={`${year} top five`}>
          <ul className={standingFillFiveListClass}>
            {rows.map((row) => (
              <li key={row.gameId} className={fillFiveColClass}>
                <StandingGameCard
                  place={row.place}
                  placeSize="lg"
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  points={row.score}
                  priority={row.place === 1}
                  pinCover
                />
              </li>
            ))}
          </ul>
        </HorizontalScroll>
      )}

      {categoryWinners.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <p className="font-display text-xl leading-none tracking-wide text-ink sm:text-2xl">
              Top Categories
            </p>
            <Link href={categoriesHref} className={outlinedLinkClass}>
              All categories
            </Link>
          </div>
          <HorizontalScroll
            className="@container mt-3"
            label={`${year} top categories`}
          >
            <ul className={standingFillFiveFlowClass}>
              {categoryWinners.map((winner) => {
                const categoryHref = `/game-of-the-year/${year}?view=category&category=${winner.categoryId}`;
                const solo = winner.games[0];
                return (
                  <li key={winner.categoryId} className="min-w-0">
                    <Link
                      href={categoryHref}
                      title={winner.label}
                      className="mb-2 block truncate font-display text-lg leading-none tracking-wide text-ink hover:text-accent sm:text-xl"
                    >
                      {winner.label}
                    </Link>
                    {winner.games.length > 1 ? (
                      <CompactTieStack
                        games={winner.games}
                        className="w-full"
                      />
                    ) : solo ? (
                      <StandingGameCard
                        slug={solo.slug}
                        title={solo.title}
                        coverUrl={solo.coverUrl}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </HorizontalScroll>
        </div>
      ) : null}
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
    categoryWinners?: CategoryHighlightWinner[];
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
          categoryWinners={section.categoryWinners}
          showRule={index > 0}
        />
      ))}
    </div>
  );
}
