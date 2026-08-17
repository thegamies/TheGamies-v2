"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
  STANDINGS_CATEGORY_GROUP_LABEL,
  parseAwardCategoryEligibility,
  parseAwardCategoryGroup,
  type StandingsCategoryGroupFilter,
} from "@/lib/live-aggregate/award-category-defs";
import {
  awardGroupsPresent,
  filterAwardCategories,
  type FilterableAwardCategory,
} from "@/lib/lists/category-filter";

/** Shared award picker: search + group filter + square grid (ballot + event settings). */
export function CategoryPickerGrid({
  unused,
  onAdd,
}: {
  unused: FilterableAwardCategory[];
  onAdd: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<StandingsCategoryGroupFilter>("all");

  const filtered = useMemo(
    () => filterAwardCategories(unused, { query, group }),
    [group, query, unused],
  );
  const filterOptions = useMemo(() => awardGroupsPresent(unused), [unused]);
  const showGroupTag = group === "all";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Search awards</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search awards"
            autoComplete="off"
            className="w-full border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <CategoryGroupFilterButton
          value={group}
          options={filterOptions}
          onChange={setGroup}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No awards match that search.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((cat) => {
            const catGroup = parseAwardCategoryGroup(cat.categoryGroup);
            const eligibility = parseAwardCategoryEligibility(cat.eligibility);
            const extra =
              eligibility === "current_year"
                ? null
                : AWARD_CATEGORY_ELIGIBILITY_LABEL[eligibility];
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  className="flex aspect-square w-full flex-col items-center justify-center border border-line px-2 py-2 text-center transition-colors hover:border-accent"
                  onClick={() => onAdd(cat.id)}
                >
                  {showGroupTag ? (
                    <span className="text-[10px] font-extrabold tracking-[0.14em] text-muted uppercase">
                      {AWARD_CATEGORY_GROUP_LABEL[catGroup]}
                    </span>
                  ) : null}
                  <span className="mt-1 line-clamp-3 font-display text-base leading-tight tracking-wide text-ink sm:text-lg">
                    {cat.label}
                  </span>
                  {extra ? (
                    <span className="mt-1 text-[10px] leading-snug text-muted sm:text-xs">
                      {extra}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CategoryGroupFilterButton({
  value,
  options,
  onChange,
}: {
  value: StandingsCategoryGroupFilter;
  options: StandingsCategoryGroupFilter[];
  onChange: (next: StandingsCategoryGroupFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active =
    options.includes(value) || value === "all" ? value : "all";

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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 border border-line px-3 py-2 text-sm tracking-wide text-ink hover:border-accent"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{STANDINGS_CATEGORY_GROUP_LABEL[active]}</span>
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
          {options.map((g) => {
            const selected = g === active;
            return (
              <li key={g} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm tracking-wide ${
                    selected
                      ? "text-accent"
                      : "text-ink hover:bg-[color-mix(in_oklab,var(--ink)_4%,transparent)]"
                  }`}
                  onClick={() => {
                    onChange(g);
                    setOpen(false);
                  }}
                >
                  {STANDINGS_CATEGORY_GROUP_LABEL[g]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
