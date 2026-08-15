"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CategoryChapterHeader } from "@/components/communities/EditionCategoryResults";
import {
  StandingGameCard,
  StandingGameCardGrid,
} from "@/components/communities/StandingGameCard";
import type { CategoryStandingsBlock } from "@/lib/live-aggregate/service";
import {
  AWARD_CATEGORY_GROUP_LABEL,
  AWARD_CATEGORY_GROUPS,
  standingsQueryString,
  type AwardCategoryGroup,
  type LiveStandingsViewId,
} from "@/lib/live-aggregate/award-category-defs";

function CategoryChapter({
  block,
  revealed,
  index,
}: {
  block: CategoryStandingsBlock;
  revealed: boolean;
  index: number;
}) {
  if (block.rows.length === 0) return null;
  return (
    <article className={index === 0 ? undefined : "mt-6 sm:mt-7"}>
      <CategoryChapterHeader
        label={block.label}
        description={block.description}
        showRule={index > 0}
        compact
      />
      <StandingGameCardGrid density="tight">
        {block.rows.map((row) => (
          <li key={`${block.categoryId}-${row.gameId}`}>
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
    </article>
  );
}

/**
 * Categories board chrome: search + one group filter button (listbox).
 * Group changes navigate; search filters chapters client-side.
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
  group: AwardCategoryGroup;
  categories: CategoryStandingsBlock[];
  revealed: boolean;
  empty: string;
  view?: LiveStandingsViewId;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Search categories</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
            <span>{AWARD_CATEGORY_GROUP_LABEL[group]}</span>
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
              {AWARD_CATEGORY_GROUPS.map((g) => {
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
                      {AWARD_CATEGORY_GROUP_LABEL[g]}
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
          {filtered.map((block, index) => (
            <CategoryChapter
              key={block.categoryId}
              block={block}
              revealed={revealed}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
