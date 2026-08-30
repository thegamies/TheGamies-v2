"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { ComparisonStripHeader } from "@/components/communities/ComparisonStripHeader";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import { RankedStandingBillboard } from "@/components/communities/RankedStandingBillboard";
import {
  EmptyStandingCard,
  StandingGameCard,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll, HorizontalScrollGroup } from "@/components/ui/HorizontalScroll";
import type {
  EditionBallotMatrix,
  EditionBallotMatrixRow,
  EditionGotyStandingRow,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";

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

/** Community / Hosts cell — single card, or compact rotating stack for ties. */
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

function GotyComparisonStrip({
  row,
  showYou,
  voiceColumns,
  slug,
  year,
  youBallotHref,
}: {
  row: EditionBallotMatrixRow;
  showYou: boolean;
  voiceColumns: MatrixVoiceColumn[];
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  const style = stripTableStyle(showYou, voiceColumns.length);

  return (
    <HorizontalScroll className="mt-2" label={`#${row.rank} comparison`}>
      <table className={STRIP_TABLE_CLASS} style={style}>
        <thead>
          <tr className="border-b border-line text-left">
            {showYou ? (
              <th scope="col" className={`${LIST_COL} py-2`}>
                <ComparisonStripHeader href={youBallotHref}>You</ComparisonStripHeader>
              </th>
            ) : null}
            <th scope="col" className={`${LIST_COL} py-2`}>
              <ComparisonStripHeader>Community</ComparisonStripHeader>
            </th>
            <th scope="col" className={`${LIST_COL} py-2`}>
              <ComparisonStripHeader>Hosts</ComparisonStripHeader>
            </th>
            {voiceColumns.map((v) => (
              <th key={v.profileId} scope="col" className={`${LIST_COL} py-2`}>
                <ComparisonStripHeader
                  title={`@${v.username}`}
                  href={editionVoterBallotHref(slug, year, v.username)}
                  person={{
                    displayName: v.displayName,
                    username: v.username,
                    avatarUrl: v.avatarUrl,
                  }}
                >
                  {v.displayName}
                </ComparisonStripHeader>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            {showYou ? (
              <td className={`${LIST_COL} py-2`}>
                <MatrixCardCell game={row.you} />
              </td>
            ) : null}
            <td className={`${LIST_COL} py-2`}>
              <MatrixStandingCell games={row.community} />
            </td>
            <td className={`${LIST_COL} py-2`}>
              <MatrixStandingCell games={row.voices} />
            </td>
            {voiceColumns.map((v) => (
              <td key={v.profileId} className={`${LIST_COL} py-2`}>
                <MatrixCardCell game={row.voiceGames[v.profileId] ?? null} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </HorizontalScroll>
  );
}

/**
 * One continuous Top 10 — Netflix-style numerals behind covers.
 * Wrapping grid only (no horizontal scroll). #1–#3 use accent + larger type.
 */
function GotyRankedBillboard({
  topTen,
}: {
  topTen: EditionGotyStandingRow[];
}) {
  return (
    <RankedStandingBillboard
      items={topTen.filter((r) => r.rank <= 10).map((row) => ({
        ...row,
        place: row.rank,
        points: row.points,
      }))}
      emptyMessage="No Game of the Year scores for this mode."
    />
  );
}

function GotyComparisonSections({
  matrix,
  slug,
  year,
  youBallotHref,
}: {
  matrix: EditionBallotMatrix;
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  const sourceRows = matrix.rows;

  if (!matrix.hasGames || sourceRows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No rankings to compare yet.</p>
    );
  }

  const rows = sourceRows.filter(
    (row) =>
      row.you != null ||
      row.community.length > 0 ||
      row.voices.length > 0 ||
      Object.values(row.voiceGames).some((g) => g != null),
  );

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No rankings to compare yet.</p>
    );
  }

  return (
    <HorizontalScrollGroup groupId={`goty-comparison:${slug}:${year}`}>
      <div className="mt-4">
        {rows.map((row, index) => (
          <article
            key={row.rank}
            className={index === 0 ? undefined : "mt-5 sm:mt-6"}
          >
            <CategoryChapterHeader
              label={`#${row.rank}`}
              showRule={index > 0}
              compact
            />
            <GotyComparisonStrip
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
    </HorizontalScrollGroup>
  );
}

/**
 * Results GOTY: ranked grid or comparison chapters.
 * Comparison follows the event’s competition / dense numbering.
 */
export function EditionGotyHighlights({
  slug,
  year,
  topTen,
  matrix,
  gotyTotal,
  standingsHref,
  youBallotHref = null,
  layout = "ranked",
}: {
  slug: string;
  year: number;
  topTen: EditionGotyStandingRow[];
  matrix: EditionBallotMatrix;
  gotyTotal: number;
  standingsHref: string;
  youBallotHref?: string | null;
  layout?: "ranked" | "comparison";
}) {
  if (topTen.length === 0 && !matrix.hasGames) {
    return (
      <p className="text-muted">
        No Game of the Year scores for this mode.
      </p>
    );
  }

  return (
    <section className="pb-8 sm:pb-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Game of the Year
        </h3>
        {gotyTotal > 10 ? (
          <Link
            href={standingsHref}
            className="text-sm text-accent hover:underline"
          >
            Full standings
          </Link>
        ) : null}
      </div>

      {layout === "comparison" ? (
        <GotyComparisonSections
          matrix={matrix}
          slug={slug}
          year={year}
          youBallotHref={youBallotHref}
        />
      ) : (
        <GotyRankedBillboard topTen={topTen} />
      )}
    </section>
  );
}
