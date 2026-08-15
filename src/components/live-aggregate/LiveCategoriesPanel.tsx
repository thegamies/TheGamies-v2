"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import type { CategoryStandingsBlock } from "@/lib/live-aggregate/service";
import {
  AWARD_CATEGORY_GROUPS,
  CATEGORY_LIST_PAGE_SIZE,
  STANDINGS_CATEGORY_GROUP_LABEL,
  standingsQueryString,
  type LiveStandingsViewId,
  type StandingsCategoryGroupFilter,
} from "@/lib/live-aggregate/award-category-defs";

function voteCountLabel(
  totalVotes: number | null,
  revealed: boolean,
): string {
  if (!revealed || totalVotes == null) return "—";
  return `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`;
}

function CategoryChapter({
  block,
  revealed,
  index,
  hrefBase,
  group,
}: {
  block: CategoryStandingsBlock;
  revealed: boolean;
  index: number;
  hrefBase: string;
  group: StandingsCategoryGroupFilter;
}) {
  if (block.rows.length === 0) return null;
  const detailHref = `${hrefBase}${standingsQueryString({
    group,
    view: "category",
    category: block.categoryId,
  })}`;

  return (
    <article className={index === 0 ? undefined : "mt-6 sm:mt-7"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={detailHref} className="group block">
            <CategoryChapterHeader
              label={block.label}
              description={block.description}
              showRule={index > 0}
              compact
            />
          </Link>
          <p className="mt-1 text-sm text-muted">
            {voteCountLabel(block.totalVotes, revealed)}
          </p>
        </div>
        <Link
          href={detailHref}
          className="shrink-0 border border-line px-3 py-1.5 text-xs tracking-wide text-muted transition-colors hover:border-accent hover:text-ink"
        >
          Full standings
        </Link>
      </div>

      <HorizontalScroll className="mt-3" label={`${block.label} top ranks`}>
        <ul className="flex w-max min-w-full flex-nowrap items-end gap-4">
          {block.rows.map((row) => (
            <li
              key={`${block.categoryId}-${row.gameId}`}
              className={
                row.place === 1
                  ? "w-[168px] shrink-0 sm:w-[190px]"
                  : "w-[132px] shrink-0 sm:w-[148px]"
              }
            >
              <StandingGameCard
                place={row.place}
                placeSize="lg"
                slug={row.slug}
                title={row.title}
                coverUrl={row.coverUrl}
                points={revealed ? row.voteCount : null}
                scoreUnit="votes"
                priority={row.place === 1}
              />
            </li>
          ))}
        </ul>
      </HorizontalScroll>
    </article>
  );
}

/**
 * Categories board: search + All/group filter button, top-rank strips,
 * load more chapters, links into full category standings.
 */
export function LiveCategoriesPanel({
  hrefBase,
  group,
  categories,
  revealed,
  empty,
  view = "categories",
}: {
  hrefBase: string;
  group: StandingsCategoryGroupFilter;
  categories: CategoryStandingsBlock[];
  revealed: boolean;
  empty: string;
  view?: LiveStandingsViewId;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CATEGORY_LIST_PAGE_SIZE);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      const el = rootRef.current;
      if (!el || el.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (block) =>
        block.label.toLowerCase().includes(q) ||
        (block.description?.toLowerCase().includes(q) ?? false),
    );
  }, [categories, query]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;
  const filterOptions: StandingsCategoryGroupFilter[] = [
    "all",
    ...AWARD_CATEGORY_GROUPS,
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Search categories</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(CATEGORY_LIST_PAGE_SIZE);
            }}
            placeholder="Search categories"
            className="w-full border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>

        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 border border-line px-3 py-2 text-sm tracking-wide text-ink hover:border-accent"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
          >
            <span>{STANDINGS_CATEGORY_GROUP_LABEL[group]}</span>
            <span
              className={`text-xs text-muted transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▾
            </span>
          </button>

          {open ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Award group"
              className="absolute right-0 z-20 mt-2 max-h-72 min-w-[11rem] overflow-y-auto border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            >
              {filterOptions.map((g) => {
                const active = g === group;
                return (
                  <li key={g} role="option" aria-selected={active}>
                    <Link
                      href={`${hrefBase}${standingsQueryString({ group: g, view })}`}
                      className={`block px-3 py-2 text-sm tracking-wide ${
                        active
                          ? "text-accent"
                          : "text-ink hover:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {STANDINGS_CATEGORY_GROUP_LABEL[g]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-muted">{empty}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-muted">No categories match that search.</p>
      ) : (
        <div className="mt-6">
          {visible.map((block, index) => (
            <CategoryChapter
              key={block.categoryId}
              block={block}
              revealed={revealed}
              index={index}
              hrefBase={hrefBase}
              group={group}
            />
          ))}
          {canLoadMore ? (
            <div className="mt-8">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((n) => n + CATEGORY_LIST_PAGE_SIZE)
                }
                className="border border-line px-3 py-2 text-sm text-ink hover:border-accent"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function LiveCategoryDetailPanel({
  hrefBase,
  group,
  block,
  revealed,
  page,
  pageSize,
  totalPages,
  gameTotal,
  empty,
}: {
  hrefBase: string;
  group: StandingsCategoryGroupFilter;
  block: CategoryStandingsBlock | null;
  revealed: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  gameTotal: number;
  empty: string;
}) {
  const backHref = `${hrefBase}${standingsQueryString({
    group,
    view: "categories",
  })}`;

  if (!block) {
    return (
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          ← Categories
        </Link>
        <p className="mt-6 text-muted">{empty}</p>
      </div>
    );
  }

  const rangeFrom = gameTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, gameTotal);

  return (
    <div>
      <Link
        href={backHref}
        className="text-sm text-muted transition-colors hover:text-accent"
      >
        ← Categories
      </Link>
      <div className="mt-4">
        <CategoryChapterHeader
          label={block.label}
          description={block.description}
        />
        <p className="mt-2 text-sm text-muted">
          {voteCountLabel(block.totalVotes, revealed)}
          {gameTotal > 0
            ? ` · ${gameTotal} game${gameTotal === 1 ? "" : "s"}`
            : null}
        </p>
      </div>

      {block.rows.length === 0 ? (
        <p className="mt-6 text-muted">{empty}</p>
      ) : (
        <>
          <StandingGameCardGrid density="tight">
            {block.rows.map((row) => (
              <li key={row.gameId}>
                <StandingGameCard
                  place={row.place}
                  slug={row.slug}
                  title={row.title}
                  coverUrl={row.coverUrl}
                  points={revealed ? row.voteCount : null}
                  scoreUnit="votes"
                />
              </li>
            ))}
          </StandingGameCardGrid>
          {totalPages > 1 ? (
            <nav
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm"
              aria-label="Category standings pages"
            >
              <p className="text-muted">
                {rangeFrom}–{rangeTo} of {gameTotal} · page {page} of{" "}
                {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`${hrefBase}${standingsQueryString({
                      group,
                      view: "category",
                      category: block.categoryId,
                      page: page - 1,
                    })}`}
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
                    href={`${hrefBase}${standingsQueryString({
                      group,
                      view: "category",
                      category: block.categoryId,
                      page: page + 1,
                    })}`}
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
        </>
      )}
    </div>
  );
}
