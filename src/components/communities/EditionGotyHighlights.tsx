"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import { RankedStandingBillboard } from "@/components/communities/RankedStandingBillboard";
import {
  EmptyStandingCard,
  StandingGameCard,
  WinnerPodium,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { navItemClass } from "@/components/ui/navLevels";
import type {
  EditionBallotMatrix,
  EditionBallotMatrixRow,
  EditionGotyStandingRow,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";

type Layout = "podiums" | "ranked" | "comparison";
/** Skip = competition (1–1–3). Dense = 1–1–2. Board = span tie across ordinal slots. */
type TieMode = "competition" | "dense" | "span";

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

/** Community / Voices cell — single card, or compact rotating stack for ties. */
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
                <MatrixHeaderLabel href={youBallotHref}>You</MatrixHeaderLabel>
              </th>
            ) : null}
            <th scope="col" className={`${LIST_COL} py-2`}>
              <MatrixHeaderLabel>Community</MatrixHeaderLabel>
            </th>
            <th scope="col" className={`${LIST_COL} py-2`}>
              <MatrixHeaderLabel>Voices</MatrixHeaderLabel>
            </th>
            {voiceColumns.map((v) => (
              <th key={v.profileId} scope="col" className={`${LIST_COL} py-2`}>
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

function GotyPodiums({
  topTen,
}: {
  topTen: EditionGotyStandingRow[];
}) {
  const podium = topTen.filter((r) => r.rank <= 3);
  const winner = podium[0] ?? null;
  const runners = podium.slice(1);

  if (!winner) {
    return (
      <p className="mt-6 text-muted">
        No Game of the Year scores for this mode.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <WinnerPodium
        winner={{
          place: winner.rank,
          gameId: winner.gameId,
          slug: winner.slug,
          title: winner.title,
          coverUrl: winner.coverUrl,
        }}
        runnersUp={runners.map((row) => ({
          place: row.rank,
          gameId: row.gameId,
          slug: row.slug,
          title: row.title,
          coverUrl: row.coverUrl,
        }))}
      />

      {topTen.some((r) => r.rank > 3 && r.rank <= 10) ? (
        <div className="mt-8 sm:mt-10">
          <h4 className="font-display text-2xl tracking-wide text-ink">
            Rest of the Top 10
          </h4>
          <HorizontalScroll className="mt-4" label="rest of the top 10">
            <ul className="flex w-max min-w-full flex-nowrap gap-4 lg:w-full lg:gap-5">
              {topTen.filter((r) => r.rank > 3 && r.rank <= 10).map((row) => (
                <li
                  key={row.gameId}
                  className="w-[132px] shrink-0 lg:w-auto lg:min-w-0 lg:flex-1"
                >
                  <StandingGameCard
                    place={row.rank}
                    slug={row.slug}
                    title={row.title}
                    coverUrl={row.coverUrl}
                  />
                </li>
              ))}
            </ul>
          </HorizontalScroll>
        </div>
      ) : null}
    </div>
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
      }))}
      emptyMessage="No Game of the Year scores for this mode."
    />
  );
}

function GotyComparisonSections({
  matrix,
  tieMode,
  slug,
  year,
  youBallotHref,
}: {
  matrix: EditionBallotMatrix;
  tieMode: TieMode;
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  const sourceRows =
    tieMode === "span"
      ? matrix.rowsSpan
      : tieMode === "dense"
        ? matrix.rowsDense
        : matrix.rows;

  if (!matrix.hasGames || sourceRows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">No rankings to compare yet.</p>
    );
  }

  // Competition: hide empty skip gaps. Board: keep ordinal slots that have content.
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
    <div className="mt-4">
      {rows.map((row, index) => (
        <article
          key={`${tieMode}-${row.rank}`}
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
  );
}

/**
 * Highlights GOTY: tertiary Podiums · Ranked · Comparison toggle.
 * Comparison: per-rank chapters with You · Community · Voices · each Voice.
 */
export function EditionGotyHighlights({
  slug,
  year,
  topTen,
  matrix,
  gotyTotal,
  standingsHref,
  youBallotHref = null,
  rankMode = "competition",
}: {
  slug: string;
  year: number;
  topTen: EditionGotyStandingRow[];
  matrix: EditionBallotMatrix;
  gotyTotal: number;
  standingsHref: string;
  youBallotHref?: string | null;
  rankMode?: TieMode;
}) {
  const [layout, setLayout] = useState<Layout>("podiums");
  const [tieMode, setTieMode] = useState<TieMode>(
    rankMode === "dense" ? "dense" : "competition",
  );

  if (topTen.length === 0 && !matrix.hasGames) {
    return (
      <p className="text-muted">
        No Game of the Year scores for this mode.
      </p>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Game of the Year
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-2"
            aria-label="Game of the Year layout"
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
          {layout === "comparison" ? (
            <div
              className="flex flex-wrap items-center gap-x-2"
              aria-label="Tie placement"
            >
              {(
                [
                  {
                    id: "competition" as const,
                    label: "Skip",
                    title: "Tied for a place; next distinct score skips (1 · 1 · 3)",
                  },
                  {
                    id: "dense" as const,
                    label: "Dense",
                    title: "Tied for a place; next distinct score is the next number (1 · 1 · 2)",
                  },
                  {
                    id: "span" as const,
                    label: "Board",
                    title:
                      "Tie fills every ordinal spot it occupies (#1 and #2 both show the stack)",
                  },
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
                    className={navItemClass("tertiary", tieMode === opt.id)}
                    aria-pressed={tieMode === opt.id}
                    title={opt.title}
                    onClick={() => setTieMode(opt.id)}
                  >
                    {opt.label}
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {gotyTotal > 10 ? (
          <Link
            href={standingsHref}
            className="text-sm text-accent hover:underline"
          >
            Full standings
          </Link>
        ) : null}
      </div>

      {layout === "podiums" ? (
        <GotyPodiums topTen={topTen} />
      ) : layout === "ranked" ? (
        <GotyRankedBillboard topTen={topTen} />
      ) : (
        <GotyComparisonSections
          matrix={matrix}
          tieMode={tieMode}
          slug={slug}
          year={year}
          youBallotHref={youBallotHref}
        />
      )}
    </section>
  );
}
