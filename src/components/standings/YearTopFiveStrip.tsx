"use client";

import type { CSSProperties } from "react";
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
import { gotyCreatorCta, type GotyCreatorCta } from "@/lib/lists/existing-goty";
import {
  DEFAULT_STANDING_FILL_MIN_VISIBLE,
  STANDING_FILL_SCOPE_CLASS,
  standingFillMinVisibleVars,
} from "@/lib/standings/standing-fill";

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

const headingRowClass =
  "flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-1";

const headingActionsClass = "flex flex-wrap items-end justify-end gap-2";

const fillFiveColClass = standingFillFiveColClass();

/**
 * One year of Top 5. Year and Top Categories are display links. Bordered
 * Full Standings / Create list and See All / Make picks sit on the right.
 * Years without category highlights still show Top Categories and a
 * compact centered empty note with a bordered add-categories control.
 * Card width is min(editorial 5-up, covers-in-view). Extra ties stay on one
 * row and scroll. A decimal covers-in-view peeks the next cover.
 */
export function YearTopFiveStrip({
  year,
  rows,
  yearHref,
  categoryWinners = [],
  showRule = false,
  minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE,
  creatorCta,
}: {
  year: number;
  rows: YearTopFiveRow[];
  yearHref: string;
  categoryWinners?: CategoryHighlightWinner[];
  showRule?: boolean;
  minVisible?: number;
  creatorCta?: GotyCreatorCta;
}) {
  const cta = creatorCta ?? gotyCreatorCta(year, null);
  const categoriesHref = `/game-of-the-year/${year}?view=categories`;

  return (
    <article
      className={
        showRule
          ? `${STANDING_FILL_SCOPE_CLASS} mt-5 sm:mt-6`
          : STANDING_FILL_SCOPE_CLASS
      }
      style={standingFillMinVisibleVars(minVisible) as CSSProperties}
    >
      <div className={headingRowClass}>
        <h3 className="m-0 font-display text-2xl leading-none tracking-wide sm:text-3xl">
          <Link
            href={yearHref}
            className="text-ink transition-colors hover:text-accent"
            aria-label={`${year} Game of the Year`}
          >
            {year}
          </Link>
        </h3>
        <div className={headingActionsClass}>
          <Link href={yearHref} className={outlinedLinkClass}>
            Full Standings
          </Link>
          <Link href={cta.listHref} className={outlinedLinkClass}>
            {cta.listLabel}
          </Link>
        </div>
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

      <div className="mt-5">
        <div className={headingRowClass}>
          <p className="m-0 font-display text-2xl leading-none tracking-wide sm:text-3xl">
            <Link
              href={categoriesHref}
              className="text-ink transition-colors hover:text-accent"
            >
              Top Categories
            </Link>
          </p>
          <div className={headingActionsClass}>
            <Link href={categoriesHref} className={outlinedLinkClass}>
              See All
            </Link>
            <Link href={cta.categoriesHref} className={outlinedLinkClass}>
              {cta.categoriesLabel}
            </Link>
          </div>
        </div>
        {categoryWinners.length > 0 ? (
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
        ) : (
          <div className="mt-3 flex min-h-28 flex-col items-center justify-center gap-3 py-6 text-center">
            <p className="text-sm text-muted">Not enough votes yet.</p>
            <Link href={cta.categoriesHref} className={outlinedLinkClass}>
              Add categories to your list
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

export function YearTopFiveSections({
  sections,
  allYearsHref,
  minVisible = DEFAULT_STANDING_FILL_MIN_VISIBLE,
}: {
  sections: Array<{
    year: number;
    rows: YearTopFiveRow[];
    yearHref: string;
    categoryWinners?: CategoryHighlightWinner[];
    creatorCta?: GotyCreatorCta;
  }>;
  allYearsHref?: string | null;
  minVisible?: number;
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
          <h2 className="text-pretty font-display text-4xl leading-none tracking-wide text-ink sm:text-5xl">
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
          creatorCta={section.creatorCta}
          showRule={index > 0}
          minVisible={minVisible}
        />
      ))}
    </div>
  );
}
