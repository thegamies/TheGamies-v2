"use client";

import { useEffect, useState, useTransition } from "react";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryMeta,
  EditionCategoryStandingRow,
} from "@/lib/communities/edition-results";
import type { EditionResultsPublicMode, SharedRankMode } from "@/lib/communities/edition-results-scoring";

type CategoryPagePayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionCategoryStandingRow[];
};

function CategoryChapterHeader({
  label,
  description,
  showRule,
  compact = false,
}: {
  label: string;
  description?: string | null;
  /** Accent-led chapter break above the masthead (skip for the first award). */
  showRule?: boolean;
  /** Tighter type + rule for GOTY rank chapters. */
  compact?: boolean;
}) {
  return (
    <header>
      {showRule ? (
        <SectionRule
          className={compact ? "mb-3" : "mb-5 sm:mb-6"}
        />
      ) : null}

      <h3
        className={
          compact
            ? "line-clamp-2 font-display text-2xl leading-none tracking-wide text-ink sm:text-3xl"
            : "line-clamp-2 font-display text-4xl leading-none tracking-wide text-ink sm:text-5xl"
        }
      >
        {label}
      </h3>
      {description ? (
        <p
          className={
            compact
              ? "mt-1.5 line-clamp-2 max-w-xl font-serif text-sm leading-relaxed text-muted"
              : "mt-2 line-clamp-2 max-w-xl font-serif text-base leading-relaxed text-muted sm:text-lg"
          }
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}

export { CategoryChapterHeader };

function CategoryFullBoard({
  slug,
  year,
  mode,
  rankMode = "competition",
  category,
  index,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  rankMode?: SharedRankMode;
  category: EditionCategoryMeta;
  index: number;
}) {
  const [rows, setRows] = useState<EditionCategoryStandingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function fetchPage(nextPage: number): Promise<CategoryPagePayload> {
    const params = new URLSearchParams({
      mode,
      categoryId: category.categoryId,
      page: String(nextPage),
    });
    const res = await fetch(
      `/api/communities/${encodeURIComponent(slug)}/edition/${year}/categories?${params}`,
    );
    if (!res.ok) throw new Error("Could not load category results.");
    return (await res.json()) as CategoryPagePayload;
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
          setError("Could not load category results. Try again.");
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- board + category identity
  }, [slug, year, mode, rankMode, category.categoryId]);

  function loadMore() {
    startTransition(async () => {
      try {
        setError(null);
        const data = await fetchPage(page + 1);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setRows((prev) => [...prev, ...data.rows]);
      } catch {
        setError("Could not load more results. Try again.");
      }
    });
  }

  return (
    <article className={index === 0 ? undefined : "mt-8 sm:mt-10"}>
      <CategoryChapterHeader
        label={category.label}
        description={category.description}
        showRule={index > 0}
      />
      <p className="mt-2 text-sm text-muted">
        {category.total} game{category.total === 1 ? "" : "s"}
      </p>

      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

      {rows.length === 0 && pending ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
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
                  points={row.votes}
                  scoreUnit="votes"
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
    </article>
  );
}

/** Categories tab: paginated cover-card grids (10 per page). */
export function EditionCategoryResults({
  slug,
  year,
  mode,
  rankMode = "competition",
  categories,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
  rankMode?: SharedRankMode;
  categories: EditionCategoryMeta[];
}) {
  if (categories.length === 0) {
    return (
      <section>
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Categories
        </h3>
        <p className="mt-4 text-sm text-muted">
          No category results for this board yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Categories
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Full tallies as cover cards — 10 at a time per award.
      </p>
      <div className="mt-8">
        {categories.map((cat, index) => (
          <CategoryFullBoard
            key={cat.categoryId}
            slug={slug}
            year={year}
            mode={mode}
            rankMode={rankMode}
            category={cat}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
