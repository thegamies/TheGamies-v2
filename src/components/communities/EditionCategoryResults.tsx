"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  StandingGameCard,
  StandingGameCardGrid,
  WinnerPodium,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { SectionRule } from "@/components/ui/SectionRule";
import type {
  EditionCategoryMeta,
  EditionCategoryPickCard,
  EditionCategoryStandingBlock,
  EditionCategoryStandingRow,
} from "@/lib/communities/edition-results";
import { editionVoterBallotHref } from "@/lib/communities/edition-results-href";
import type { EditionResultsPublicMode } from "@/lib/communities/edition-results-scoring";

type CategoryPagePayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: EditionCategoryStandingRow[];
};

function MatrixGameCell({
  game,
}: {
  game: {
    slug: string;
    title: string;
    coverUrl: string | null;
  } | null;
}) {
  if (!game) {
    return <span className="text-muted">—</span>;
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

const LABEL_COL = "left-0 w-10 min-w-10";
const LIST_COL = "w-[103px] min-w-[103px]";

function CategoryChapterHeader({
  label,
  description,
  showRule,
}: {
  label: string;
  description?: string | null;
  /** Accent-led chapter break above the masthead (skip for the first award). */
  showRule?: boolean;
}) {
  return (
    <header>
      {showRule ? <SectionRule className="mb-5 sm:mb-6" /> : null}

      <h3 className="font-display text-4xl leading-none tracking-wide text-ink sm:text-5xl">
        {label}
      </h3>
      {description ? (
        <p className="mt-2 max-w-xl font-serif text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </header>
  );
}

function CategoryPodiumBlock({
  slug,
  year,
  cat,
  picks,
  index,
  youBallotHref,
}: {
  slug: string;
  year: number;
  cat: EditionCategoryStandingBlock;
  picks: EditionCategoryPickCard[];
  index: number;
  youBallotHref: string | null;
}) {
  const winner = cat.rows[0] ?? null;
  const podium = cat.rows.slice(1, 3);

  return (
    <article className={index === 0 ? undefined : "mt-10 sm:mt-12"}>
      <CategoryChapterHeader
        label={cat.label}
        description={cat.description}
        showRule={index > 0}
      />

      {winner ? (
        <div className="mt-4">
          <WinnerPodium
            winner={{
              place: winner.place,
              gameId: winner.gameId,
              slug: winner.slug,
              title: winner.title,
              coverUrl: winner.coverUrl,
              meta: `${winner.votes} vote${winner.votes === 1 ? "" : "s"}`,
            }}
            runnersUp={podium.map((row) => ({
              place: row.place,
              gameId: row.gameId,
              slug: row.slug,
              title: row.title,
              coverUrl: row.coverUrl,
              meta: `${row.votes} vote${row.votes === 1 ? "" : "s"}`,
            }))}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No picks for this category.</p>
      )}

      {picks.length > 0 ? (
        <HorizontalScroll className="mt-6" label="category picks">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th
                  scope="col"
                  className={`sticky z-20 bg-paper px-1 py-3 ${LABEL_COL}`}
                >
                  <span className="sr-only">Column</span>
                </th>
                {picks.map((pick) => {
                  const href =
                    pick.kind === "you"
                      ? youBallotHref
                      : editionVoterBallotHref(slug, year, pick.username);
                  return (
                    <th
                      key={`${pick.kind}-${pick.profileId}`}
                      scope="col"
                      className={`px-2 py-3 ${LIST_COL}`}
                      title={
                        pick.kind === "you" ? undefined : `@${pick.username}`
                      }
                    >
                      {href ? (
                        <Link
                          href={href}
                          className="line-clamp-2 text-sm font-semibold leading-snug text-ink underline-offset-2 hover:text-accent hover:underline"
                        >
                          {pick.kind === "you" ? "You" : pick.displayName}
                        </Link>
                      ) : (
                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                          {pick.kind === "you" ? "You" : pick.displayName}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <th
                  scope="row"
                  className={`sticky z-10 bg-paper px-1 py-3 text-left text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase ${LABEL_COL}`}
                >
                  Pick
                </th>
                {picks.map((pick) => (
                  <td
                    key={`${pick.kind}-${pick.profileId}`}
                    className={`px-2 py-3 ${LIST_COL}`}
                  >
                    <MatrixGameCell
                      game={{
                        slug: pick.slug,
                        title: pick.title,
                        coverUrl: pick.coverUrl,
                      }}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </HorizontalScroll>
      ) : null}
    </article>
  );
}

function CategoryFullBoard({
  slug,
  year,
  mode,
  category,
  index,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
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
    setRows([]);
    setPage(0);
    setError(null);
    startTransition(async () => {
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
  }, [slug, year, mode, category.categoryId]);

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
    <article className={index === 0 ? undefined : "mt-10 sm:mt-12"}>
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
                  place={row.place}
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

/** Overview: podium + horizontal You / Voices ballot strip. */
export function EditionCategoryPodiums({
  slug,
  year,
  categories,
  pickStrips,
  youBallotHref = null,
}: {
  slug: string;
  year: number;
  categories: EditionCategoryStandingBlock[];
  pickStrips: Record<string, EditionCategoryPickCard[]>;
  youBallotHref?: string | null;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="mt-8">
      {categories.map((cat, index) => (
        <CategoryPodiumBlock
          key={cat.categoryId}
          slug={slug}
          year={year}
          cat={cat}
          picks={pickStrips[cat.categoryId] ?? []}
          index={index}
          youBallotHref={youBallotHref}
        />
      ))}
    </div>
  );
}

/** Categories tab: paginated cover-card grids (10 per page). */
export function EditionCategoryResults({
  slug,
  year,
  mode,
  categories,
}: {
  slug: string;
  year: number;
  mode: EditionResultsPublicMode;
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
            category={cat}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
