import Link from "next/link";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import type { EditionGotyStandingRow } from "@/lib/communities/edition-results";
import { editionGotyStandingsHref } from "@/lib/communities/edition-results-href";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
} from "@/lib/communities/edition-results-scoring";

export function EditionFullStandings({
  slug,
  year,
  mode,
  page,
  pageSize,
  total,
  totalPages,
  rows,
  paginate = true,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionGotyStandingRow[];
  /** Host preview can show a first slice without page links. */
  paginate?: boolean;
}) {
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);
  const showPager = paginate && totalPages > 1;

  return (
    <section>
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Full standings
      </h3>
      <p className="mt-2 text-sm text-muted">
        {total} game{total === 1 ? "" : "s"} on the {editionBoardLabel(mode)}{" "}
        board.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No Game of the Year scores for this board yet.
        </p>
      ) : (
        <>
          <StandingGameCardGrid>
            {rows.map((row) => (
              <li key={row.gameId}>
                <StandingGameCard
                  place={row.rank}
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  points={row.points}
                />
              </li>
            ))}
          </StandingGameCardGrid>
          {showPager ? (
            <nav
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
              aria-label="Full standings pages"
            >
              <p className="text-muted">
                {rangeFrom}–{rangeTo} of {total} · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={editionGotyStandingsHref(slug, year, {
                      mode,
                      page: page - 1,
                    })}
                    className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="border border-line px-3 py-1.5 text-muted/50">
                    Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={editionGotyStandingsHref(slug, year, {
                      mode,
                      page: page + 1,
                    })}
                    className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="border border-line px-3 py-1.5 text-muted/50">
                    Next
                  </span>
                )}
              </div>
            </nav>
          ) : null}
          {!paginate && rows.length < total ? (
            <p className="mt-6 text-sm text-muted">
              Showing the first {rows.length} of {total}. The full board opens
              when results publish.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
