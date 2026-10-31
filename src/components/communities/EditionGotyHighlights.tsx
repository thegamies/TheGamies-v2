import Link from "@/lib/next-link";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { ComparisonStripHeader } from "@/components/communities/ComparisonStripHeader";
import {
  comparisonColumnCount,
  comparisonStripTableClass,
  comparisonStripTableStyle,
} from "@/components/communities/comparison-strip";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import { RankedStandingBillboard } from "@/components/communities/RankedStandingBillboard";
import {
  EmptyStandingCard,
  StandingGameCard,
  standingCmpCellRankClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import type {
  EditionBallotMatrix,
  EditionBallotMatrixRow,
  EditionGotyStandingRow,
  MatrixVoiceColumn,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";

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

function GotyComparisonColumnHeaders({
  showYou,
  voiceColumns,
  slug,
  year,
  youBallotHref,
}: {
  showYou: boolean;
  voiceColumns: MatrixVoiceColumn[];
  slug: string;
  year: number;
  youBallotHref: string | null;
}) {
  return (
    <tr className="border-b border-line text-left">
      {showYou ? (
        <th scope="col" className={standingCmpCellRankClass}>
          <ComparisonStripHeader href={youBallotHref}>You</ComparisonStripHeader>
        </th>
      ) : null}
      <th scope="col" className={standingCmpCellRankClass}>
        <ComparisonStripHeader>Community</ComparisonStripHeader>
      </th>
      <th scope="col" className={standingCmpCellRankClass}>
        <ComparisonStripHeader>Hosts</ComparisonStripHeader>
      </th>
      {voiceColumns.map((v) => (
        <th key={v.profileId} scope="col" className={standingCmpCellRankClass}>
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
  );
}

function GotyComparisonRankRow({
  row,
  showYou,
  voiceColumns,
}: {
  row: EditionBallotMatrixRow;
  showYou: boolean;
  voiceColumns: MatrixVoiceColumn[];
}) {
  return (
    <tr className="align-top">
      {showYou ? (
        <td className={standingCmpCellRankClass}>
          <MatrixCardCell game={row.you} />
        </td>
      ) : null}
      <td className={standingCmpCellRankClass}>
        <MatrixStandingCell games={row.community} />
      </td>
      <td className={standingCmpCellRankClass}>
        <MatrixStandingCell games={row.voices} />
      </td>
      {voiceColumns.map((v) => (
        <td key={v.profileId} className={standingCmpCellRankClass}>
          <MatrixCardCell game={row.voiceGames[v.profileId] ?? null} />
        </td>
      ))}
    </tr>
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

/**
 * One horizontal scrollport for every rank — columns stay aligned with native
 * touch pan (no per-row scroll sync).
 */
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

  const columnCount = comparisonColumnCount(
    matrix.showYou,
    matrix.voiceColumns.length,
  );
  const tableClass = comparisonStripTableClass(columnCount);
  const tableStyle = comparisonStripTableStyle(columnCount);

  return (
    <HorizontalScroll className="mt-4" label="Game of the Year comparison">
      {/*
        One overflow-x + one table for every rank — native pan, no scrollLeft
        sync, shared column widths. Each rank keeps its own column names
        (You / Community / Hosts / hosts), same as the old per-strip thead.
      */}
      <table className={tableClass} style={tableStyle}>
        {rows.map((row, index) => (
          <tbody key={row.rank}>
            <tr>
              <td
                colSpan={columnCount}
                className={
                  index === 0
                    ? "p-0"
                    : "border-t border-line p-0 pt-5 sm:pt-6"
                }
              >
                <div className="sticky left-0 z-[1] w-max max-w-[min(100%,20rem)] bg-paper pr-3">
                  <CategoryChapterHeader
                    label={`#${row.rank}`}
                    showRule={false}
                    compact
                  />
                </div>
              </td>
            </tr>
            <GotyComparisonColumnHeaders
              showYou={matrix.showYou}
              voiceColumns={matrix.voiceColumns}
              slug={slug}
              year={year}
              youBallotHref={youBallotHref}
            />
            <GotyComparisonRankRow
              row={row}
              showYou={matrix.showYou}
              voiceColumns={matrix.voiceColumns}
            />
          </tbody>
        ))}
      </table>
    </HorizontalScroll>
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
