"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import {
  CategoryChapterHeader,
  EditionCategoryPodiums,
} from "@/components/communities/EditionCategoryResults";
import { RankedStandingBillboard } from "@/components/communities/RankedStandingBillboard";
import { EmptyStandingCard, StandingGameCard } from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { navItemClass } from "@/components/ui/navLevels";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryComparisonMatrix,
  EditionCategoryComparisonRow,
  EditionCategoryStandingBlock,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";

type Layout = "podiums" | "ranked" | "comparison";

/** Cell padding each side (`px-2`). Column: 103+16 → 119; lg 206+16 → 222. */
const CELL_PAD_X = 8;

const LIST_COL =
  "box-border w-[var(--strip-col)] min-w-[var(--strip-col)] max-w-[var(--strip-col)] px-2 align-top";

const STRIP_TABLE_CLASS =
  "w-max min-w-full border-collapse text-sm [--strip-col:119px] lg:[--strip-col:222px]";

function listColumnCount(showYou: boolean, voiceCount: number) {
  return (showYou ? 1 : 0) + 2 + voiceCount;
}

function stripTableStyle(
  showYou: boolean,
  voiceCount: number,
): CSSProperties {
  const cols = listColumnCount(showYou, voiceCount);
  return {
    width: `calc(${cols} * var(--strip-col))`,
    minWidth: `calc(${cols} * var(--strip-col))`,
    tableLayout: "fixed",
  };
}

function MatrixHeaderLabel({
  children,
  title,
  href,
}: {
  children: ReactNode;
  title?: string;
  href?: string | null;
}) {
  const style = { width: `calc(var(--strip-col) - ${CELL_PAD_X * 2}px)` };
  if (href) {
    return (
      <Link
        href={href}
        className="line-clamp-2 block text-left text-sm font-semibold leading-snug text-ink underline-offset-2 transition-colors hover:text-accent hover:underline"
        title={title}
        style={style}
      >
        {children}
      </Link>
    );
  }
  return (
    <span
      className="line-clamp-2 block text-left text-sm font-semibold leading-snug text-muted"
      title={title}
      style={style}
    >
      {children}
    </span>
  );
}

function MatrixStandingCell({
  games,
}: {
  games: Array<{
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
}) {
  if (games.length === 0) {
    return <EmptyStandingCard />;
  }

  if (games.length === 1) {
    return <MatrixCardCell game={games[0]!} />;
  }

  return <CompactTieStack games={games} />;
}

function MatrixCardCell({
  game,
}: {
  game: {
    slug: string;
    title: string;
    coverUrl: string | null;
  } | null;
}) {
  if (!game) {
    return <EmptyStandingCard />;
  }
  return (
    <StandingGameCard
      slug={game.slug}
      title={game.title}
      coverUrl={game.coverUrl}
      size="sm"
    />
  );
}

function CategoryComparisonStrip({
  row,
  showYou,
  voiceColumns,
  slug,
  year,
  youBallotHref,
}: {
  row: EditionCategoryComparisonRow;
  showYou: boolean;
  voiceColumns: MatrixVoiceColumn[];
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  const style = stripTableStyle(showYou, voiceColumns.length);

  return (
    <HorizontalScroll className="mt-4" label={`${row.label} comparison`}>
      <table className={STRIP_TABLE_CLASS} style={style}>
        <thead>
          <tr className="border-b border-line text-left">
            {showYou ? (
              <th scope="col" className={`${LIST_COL} py-3`}>
                <MatrixHeaderLabel href={youBallotHref}>You</MatrixHeaderLabel>
              </th>
            ) : null}
            <th scope="col" className={`${LIST_COL} py-3`}>
              <MatrixHeaderLabel>Community</MatrixHeaderLabel>
            </th>
            <th scope="col" className={`${LIST_COL} py-3`}>
              <MatrixHeaderLabel>Voices</MatrixHeaderLabel>
            </th>
            {voiceColumns.map((v) => (
              <th key={v.profileId} scope="col" className={`${LIST_COL} py-3`}>
                <MatrixHeaderLabel
                  title={`@${v.username}`}
                  href={editionVoterBallotHref(slug, year, v.username)}
                >
                  {v.displayName}
                </MatrixHeaderLabel>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            {showYou ? (
              <td className={`${LIST_COL} py-3`}>
                <MatrixCardCell game={row.you} />
              </td>
            ) : null}
            <td className={`${LIST_COL} py-3`}>
              <MatrixStandingCell games={row.community} />
            </td>
            <td className={`${LIST_COL} py-3`}>
              <MatrixStandingCell games={row.voices} />
            </td>
            {voiceColumns.map((v) => (
              <td key={v.profileId} className={`${LIST_COL} py-3`}>
                <MatrixCardCell game={row.voiceGames[v.profileId] ?? null} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </HorizontalScroll>
  );
}

function CategoryComparisonSections({
  matrix,
  categoryPodiums,
  slug,
  year,
  youBallotHref,
}: {
  matrix: EditionCategoryComparisonMatrix;
  categoryPodiums: EditionCategoryStandingBlock[];
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  if (!matrix.hasGames || matrix.rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No category picks to compare yet.</p>
    );
  }

  const descriptions = new Map(
    categoryPodiums.map((c) => [c.categoryId, c.description]),
  );

  return (
    <div className="mt-6">
      {matrix.rows.map((row, index) => (
        <article
          key={row.categoryId}
          className={index === 0 ? undefined : "mt-8 sm:mt-10"}
        >
          <CategoryChapterHeader
            label={row.label}
            description={descriptions.get(row.categoryId) ?? null}
            showRule={index > 0}
          />
          <CategoryComparisonStrip
            row={row}
            showYou={matrix.showYou}
            voiceColumns={matrix.voiceColumns}
            slug={slug}
            year={year}
            youBallotHref={youBallotHref}
          />
        </article>
      ))}
    </div>
  );
}

/** Per-award Top 3 with Netflix-style numerals (same language as GOTY Ranked). */
function CategoryRankedSections({
  categories,
}: {
  categories: EditionCategoryStandingBlock[];
}) {
  if (categories.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No category scores for this mode.</p>
    );
  }

  return (
    <div className="mt-6">
      {categories.map((cat, index) => (
        <article
          key={cat.categoryId}
          className={index === 0 ? undefined : "mt-8 sm:mt-10"}
        >
          <CategoryChapterHeader
            label={cat.label}
            description={cat.description}
            showRule={index > 0}
          />
          <RankedStandingBillboard
            className="mt-4"
            items={cat.rows.map((row) => ({
              ...row,
              place: row.rank,
            }))}
            emptyMessage="No scores for this award yet."
          />
        </article>
      ))}
    </div>
  );
}

/**
 * Highlights Categories: tertiary Podiums · Ranked · Comparison toggle.
 * Comparison keeps per-award chapters; each shows You · Community · Voices · Voices.
 */
export function EditionCategoriesHighlights({
  slug,
  year,
  categoriesHref,
  categoryPodiums,
  categoryComparison,
  youBallotHref = null,
}: {
  slug: string;
  year: number;
  categoriesHref: string;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref?: string | null;
}) {
  const [layout, setLayout] = useState<Layout>("podiums");

  if (categoryPodiums.length === 0 && !categoryComparison.hasGames) {
    return null;
  }

  return (
    <section>
      <SectionRule className="mb-6" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Categories
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-2"
            aria-label="Categories layout"
          >
            {(
              [
                { id: "podiums" as const, label: "Podiums" },
                { id: "ranked" as const, label: "Ranked" },
                { id: "comparison" as const, label: "Comparison" },
              ] as const
            ).map((opt, i) => (
              <span key={opt.id} className="contents">
                {i > 0 ? (
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                ) : null}
                <button
                  type="button"
                  className={navItemClass("tertiary", layout === opt.id)}
                  aria-pressed={layout === opt.id}
                  onClick={() => setLayout(opt.id)}
                >
                  {opt.label}
                </button>
              </span>
            ))}
          </div>
        </div>
        <Link
          href={categoriesHref}
          className="text-sm text-accent hover:underline"
        >
          Full category results
        </Link>
      </div>

      {layout === "podiums" ? (
        <EditionCategoryPodiums categories={categoryPodiums} />
      ) : layout === "ranked" ? (
        <CategoryRankedSections categories={categoryPodiums} />
      ) : (
        <CategoryComparisonSections
          matrix={categoryComparison}
          categoryPodiums={categoryPodiums}
          slug={slug}
          year={year}
          youBallotHref={youBallotHref}
        />
      )}
    </section>
  );
}
