"use client";

import { useState, useTransition } from "react";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import type { EditionGotyStandingRow } from "@/lib/communities/edition-results";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

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
  beyondTopTen,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  beyondTopTen: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<EditionGotyStandingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (beyondTopTen <= 0) return null;

  async function loadPage(nextPage: number, append: boolean) {
    setError(null);
    const params = new URLSearchParams({
      mode,
      page: String(nextPage),
      afterPlace: "10",
    });
    const res = await fetch(
      `/api/communities/${encodeURIComponent(slug)}/edition/${year}/standings?${params}`,
    );
    if (!res.ok) {
      throw new Error("Could not load standings.");
    }
    const data = (await res.json()) as StandingsPayload;
    setPage(data.page);
    setTotalPages(data.totalPages);
    setRows((prev) => (append ? [...prev, ...data.rows] : data.rows));
  }

  function expand() {
    startTransition(async () => {
      try {
        await loadPage(1, false);
        setOpen(true);
      } catch {
        setError("Could not load full standings. Try again.");
      }
    });
  }

  function loadMore() {
    startTransition(async () => {
      try {
        await loadPage(page + 1, true);
      } catch {
        setError("Could not load more standings. Try again.");
      }
    });
  }

  function collapse() {
    setOpen(false);
  }

  return (
    <section className="border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl tracking-wide text-ink">
            Full standings
          </h3>
          <p className="mt-2 text-sm text-muted">
            {beyondTopTen} more game{beyondTopTen === 1 ? "" : "s"} beyond the
            top 10.
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={expand}
            disabled={pending}
            className="border border-line px-3 py-2 text-sm text-ink hover:border-accent disabled:opacity-60"
          >
            {pending ? "Loading…" : "Show full standings"}
          </button>
        ) : (
          <button
            type="button"
            onClick={collapse}
            className="border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-ink"
          >
            Hide
          </button>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

      {open ? (
        <>
          <StandingGameCardGrid>
            {rows.map((row) => (
              <li key={row.gameId}>
                <StandingGameCard
                  place={row.place}
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
