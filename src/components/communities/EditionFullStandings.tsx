"use client";

import { useEffect, useState, useTransition } from "react";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import type { EditionGotyStandingRow } from "@/lib/communities/edition-results";
import {
  editionBoardLabel,
  type EditionResultsPublicMode,
  type SharedRankMode,
} from "@/lib/communities/edition-results-scoring";

type StandingsPayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionGotyStandingRow[];
};

export function EditionFullStandings({
  slug,
  year,
  mode,
  rankMode = "competition",
  totalGames,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  rankMode?: SharedRankMode;
  totalGames: number;
}) {
  const [rows, setRows] = useState<EditionGotyStandingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function fetchPage(nextPage: number): Promise<StandingsPayload> {
    const params = new URLSearchParams({
      mode,
      page: String(nextPage),
    });
    const res = await fetch(
      `/api/communities/${encodeURIComponent(slug)}/edition/${year}/standings?${params}`,
    );
    if (!res.ok) {
      throw new Error("Could not load standings.");
    }
    return (await res.json()) as StandingsPayload;
  }

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      setRows([]);
      setPage(0);
      setError(null);
      try {
        const data = await fetchPage(1);
        if (cancelled) return;
        setPage(data.page);
        setTotalPages(data.totalPages);
        setRows(data.rows);
      } catch {
        if (!cancelled) {
          setError("Could not load full standings. Try again.");
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- board identity only
  }, [slug, year, mode, rankMode]);

  function loadMore() {
    startTransition(async () => {
      try {
        setError(null);
        const data = await fetchPage(page + 1);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setRows((prev) => [...prev, ...data.rows]);
      } catch {
        setError("Could not load more standings. Try again.");
      }
    });
  }

  if (totalGames <= 0) {
    return (
      <section>
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Full standings
        </h3>
        <p className="mt-4 text-sm text-muted">
          No Game of the Year scores for this board yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Full standings
      </h3>
      <p className="mt-2 text-sm text-muted">
        {totalGames} game{totalGames === 1 ? "" : "s"} on the{" "}
        {editionBoardLabel(mode)} board.
      </p>

      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

      {rows.length === 0 && pending ? (
        <p className="mt-6 text-sm text-muted">Loading standings…</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <StandingGameCardGrid>
            {rows.map((row) => (
              <li key={row.gameId}>
                <StandingGameCard
                  place={row.rank}
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  year={row.year}
                  points={row.points}
                />
              </li>
            ))}
          </StandingGameCardGrid>
          {page < totalPages ? (
            <div className="mt-8">
              <button
                type="button"
                onClick={loadMore}
                disabled={pending}
                className="border border-line px-3 py-2 text-sm text-ink hover:border-accent disabled:opacity-60"
              >
                {pending ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
