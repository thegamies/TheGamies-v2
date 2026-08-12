import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { RankMarker } from "@/components/ui/RankMarker";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { MATRIX_COVER } from "@/components/communities/coverSizes";
import type {
  EditionBallotMatrix,
  MatrixGameCell,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";

function MatrixCardCell({
  game,
}: {
  game: MatrixGameCell | null;
}) {
  if (!game) {
    return (
      <span className="block w-full pt-1 text-muted" aria-hidden>
        —
      </span>
    );
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

/** Rank gutter — matches `w-10`. */
const RANK_PX = 40;
/** Card art width; list column = card + horizontal cell padding. */
const CARD_PX = MATRIX_COVER.width;
const CELL_PAD_X = 8;
const LIST_PX = CARD_PX + CELL_PAD_X * 2;

const RANK_COL =
  "sticky left-0 box-border w-10 min-w-10 max-w-10 bg-paper";
const LIST_COL =
  "box-border w-[119px] min-w-[119px] max-w-[119px] px-2 align-top";

function listColumnCount(matrix: EditionBallotMatrix) {
  return (
    (matrix.showYou ? 1 : 0) + 2 + matrix.voiceColumns.length // Community + Voices
  );
}

function matrixTableStyle(matrix: EditionBallotMatrix): CSSProperties {
  const width = RANK_PX + listColumnCount(matrix) * LIST_PX;
  return { width, minWidth: width, tableLayout: "fixed" };
}

function MatrixColgroup({ matrix }: { matrix: EditionBallotMatrix }) {
  const listCols = listColumnCount(matrix);
  return (
    <colgroup>
      <col style={{ width: RANK_PX }} />
      {Array.from({ length: listCols }, (_, i) => (
        <col key={i} style={{ width: LIST_PX }} />
      ))}
    </colgroup>
  );
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
  const className =
    "line-clamp-2 block text-left text-sm font-semibold leading-snug text-ink";
  const style = { width: CARD_PX };
  if (href) {
    return (
      <Link
        href={href}
        className={`${className} underline-offset-2 hover:text-accent hover:underline`}
        title={title}
        style={style}
      >
        {children}
      </Link>
    );
  }
  return (
    <span className={className} title={title} style={style}>
      {children}
    </span>
  );
}

function MatrixHeaderRow({
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
  return (
    <table
      className="border-separate border-spacing-0 text-sm"
      style={matrixTableStyle(matrix)}
    >
      <MatrixColgroup matrix={matrix} />
      <thead>
        <tr className="text-left">
          <th
            scope="col"
            className={`${RANK_COL} z-30 border-r border-line px-1 py-3 text-center text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase`}
          >
            #
          </th>
          {matrix.showYou ? (
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
          {matrix.voiceColumns.map((v) => (
            <th
              key={v.profileId}
              scope="col"
              className={`${LIST_COL} py-3`}
            >
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
    </table>
  );
}

export function BallotMatrix({
  matrix,
  slug,
  year,
  youBallotHref = null,
}: {
  matrix: EditionBallotMatrix;
  slug: string;
  year: number;
  youBallotHref?: string | null;
}) {
  if (!matrix.hasGames) {
    return (
      <section>
        <SectionRule className="mb-8" />
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Ballot matrix
        </h3>
        <p className="mt-4 text-sm text-muted">
          No top-ten lists to compare yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionRule className="mb-8" />
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Ballot matrix
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Top 10 side by side — column labels stick while you scroll the page;
        drag or use the arrows to move across lists. Voice names open that
        ballot.
      </p>

      <HorizontalScroll
        className="mt-6"
        viewportClassName="border-b border-line"
        label="ballot matrix"
        stickyHeader={
          <MatrixHeaderRow
            matrix={matrix}
            slug={slug}
            year={year}
            youBallotHref={youBallotHref}
          />
        }
      >
        <table
          className="border-separate border-spacing-0 text-sm"
          style={matrixTableStyle(matrix)}
        >
          <MatrixColgroup matrix={matrix} />
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.rank} className="align-top">
                <th
                  scope="row"
                  className={`${RANK_COL} z-20 border-r border-b border-line px-1 py-3 text-center`}
                >
                  <RankMarker rank={row.rank} className="mx-auto" />
                </th>
                {matrix.showYou ? (
                  <td className={`${LIST_COL} border-b border-line py-3`}>
                    <MatrixCardCell game={row.you} />
                  </td>
                ) : null}
                <td className={`${LIST_COL} border-b border-line py-3`}>
                  <MatrixCardCell game={row.community} />
                </td>
                <td className={`${LIST_COL} border-b border-line py-3`}>
                  <MatrixCardCell game={row.voices} />
                </td>
                {matrix.voiceColumns.map((v) => (
                  <td
                    key={v.profileId}
                    className={`${LIST_COL} border-b border-line py-3`}
                  >
                    <MatrixCardCell
                      game={row.voiceGames[v.profileId] ?? null}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScroll>
    </section>
  );
}
