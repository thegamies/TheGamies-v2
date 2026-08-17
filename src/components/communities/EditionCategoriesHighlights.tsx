"use client";

import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { useEditionCategoryPodiums } from "@/components/communities/EditionCategoryDebug";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import {
  EmptyStandingCard,
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryComparisonMatrix,
  EditionCategoryComparisonRow,
  EditionCategoryStandingBlock,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import {
  editionCategoryStandingsHref,
  editionVoterBallotHref,
} from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

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
              <MatrixHeaderLabel>Hosts</MatrixHeaderLabel>
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
  mode,
  youBallotHref,
}: {
  matrix: EditionCategoryComparisonMatrix;
  categoryPodiums: EditionCategoryStandingBlock[];
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
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
            action={
              <Link
                href={editionCategoryStandingsHref(
                  slug,
                  year,
                  row.categoryId,
                  { mode },
                )}
                className="text-sm text-accent hover:underline"
              >
                Full standings
              </Link>
            }
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

/** Per-award Top 3 on one line; overflow uses HorizontalScroll. */
function CategoryRankedSections({
  slug,
  year,
  mode,
  categories,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
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
            action={
              <Link
                href={editionCategoryStandingsHref(
                  slug,
                  year,
                  cat.categoryId,
                  { mode },
                )}
                className="text-sm text-accent hover:underline"
              >
                Full standings
              </Link>
            }
          />
          {cat.rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No scores for this award yet.
            </p>
          ) : (
            <HorizontalScroll
              className="mt-4"
              label={`${cat.label} ranked`}
            >
              <ul className={standingStripListClass}>
                {cat.rows.map((row) => (
                  <li
                    key={row.gameId}
                    className={standingStripColClass(row.rank === 1)}
                  >
                    <StandingGameCard
                      place={row.rank}
                      placeSize="lg"
                      slug={row.slug}
                      title={row.title}
                      coverUrl={row.coverUrl}
                      points={row.votes}
                      scoreUnit="votes"
                      priority={row.rank === 1}
                      pinCover
                    />
                  </li>
                ))}
              </ul>
            </HorizontalScroll>
          )}
        </article>
      ))}
    </div>
  );
}

/**
 * Results Categories: ranked one-line strips or comparison chapters.
 */
export function EditionCategoriesHighlights({
  slug,
  year,
  mode = "community",
  categoryPodiums,
  categoryComparison,
  youBallotHref = null,
  layout = "ranked",
}: {
  slug: string;
  year: number;
  mode?: EditionResultsPublicMode;
  categoryPodiums: EditionCategoryStandingBlock[];
  categoryComparison: EditionCategoryComparisonMatrix;
  youBallotHref?: string | null;
  layout?: "ranked" | "comparison";
}) {
  const categories = useEditionCategoryPodiums(categoryPodiums);

  if (categories.length === 0 && !categoryComparison.hasGames) {
    return null;
  }

  return (
    <section>
      <SectionRule className="mb-6" />
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Categories
      </h3>

      {layout === "comparison" ? (
        <CategoryComparisonSections
          matrix={categoryComparison}
          categoryPodiums={categories}
          slug={slug}
          year={year}
          mode={mode}
          youBallotHref={youBallotHref}
        />
      ) : (
        <CategoryRankedSections
          slug={slug}
          year={year}
          mode={mode}
          categories={categories}
        />
      )}
    </section>
  );
}
