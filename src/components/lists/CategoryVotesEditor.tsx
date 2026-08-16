"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { type GameSearchHit } from "@/app/create/search-actions";
import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { Button } from "@/components/ui/Button";
import {
  CategoryPickCard,
  CategoryVoteHeading,
} from "@/components/ui/CategoryPickCard";
import { Dialog } from "@/components/ui/Dialog";
import { GameSearchField } from "@/components/ui/GameSearchField";
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
  sortedAwardCategories,
} from "@/lib/lists/category-filter";

export type AwardCategoryOption = {
  id: string;
  label: string;
  description: string | null;
  sortOrder?: number;
  categoryGroup?: string;
  eligibility?: string;
  allowEditions?: boolean;
};

export type CategoryVoteSelection = {
  categoryId: string;
  gameId: string;
  title: string;
  coverUrl: string | null;
};

type Props = {
  categories: AwardCategoryOption[];
  value: CategoryVoteSelection[];
  onChange: (next: CategoryVoteSelection[]) => void;
  year: number;
  description?: string;
  /** When set, show awards but block picks (signed-out list editor). */
  locked?: boolean;
  lockHref?: string;
  lockMessage?: string;
  /** Optional controls aligned with the Award picks heading (e.g. Save / Share). */
  actions?: ReactNode;
};

export function CategoryVotesEditor({
  categories,
  value,
  onChange,
  year,
  description = "Add the awards you want to pick. Search is limited to each category’s eligibility.",
  locked = false,
  lockHref,
  lockMessage = "Sign in to choose award winners for your GOTY list.",
  actions,
}: Props) {
  const catalog = useMemo(() => sortedAwardCategories(categories), [categories]);
  const [openIds, setOpenIds] = useState<string[]>(() =>
    value.map((v) => v.categoryId),
  );
  const [listQuery, setListQuery] = useState("");
  const [listGroup, setListGroup] =
    useState<StandingsCategoryGroupFilter>("all");
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleIds = useMemo(() => {
    const ids = new Set(openIds);
    for (const vote of value) ids.add(vote.categoryId);
    return catalog.filter((c) => ids.has(c.id)).map((c) => c.id);
  }, [catalog, openIds, value]);

  const unused = catalog.filter((c) => !visibleIds.includes(c.id));
  const added = catalog.filter((c) => visibleIds.includes(c.id));
  const filteredAdded = useMemo(
    () =>
      filterAwardCategories(added, { query: listQuery, group: listGroup }),
    [added, listGroup, listQuery],
  );
  const listFilterOptions = useMemo(
    () => awardGroupsPresent(added),
    [added],
  );

  function pick(categoryId: string, hit: GameSearchHit) {
    const without = value.filter((v) => v.categoryId !== categoryId);
    onChange([
      ...without,
      {
        categoryId,
        gameId: hit.id,
        title: hit.title,
        coverUrl: hit.coverUrl,
      },
    ]);
  }

  function clear(categoryId: string) {
    onChange(value.filter((v) => v.categoryId !== categoryId));
  }

  function addCategory(id: string) {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPickerOpen(false);
  }

  function removeCategory(id: string) {
    clear(id);
    setOpenIds((prev) => prev.filter((openId) => openId !== id));
  }

  if (catalog.length === 0) return null;

  const canAdd = unused.length > 0;

  if (locked) {
    return (
      <section>
        <BallotChapterHeader
          eyebrow="Categories"
          title="Award picks"
          description="Site award categories for this year’s Game of the Year."
          actions={actions}
        />
        <div className="mt-6 border border-line bg-panel p-5">
          <p className="font-display text-2xl tracking-wide text-ink">
            Sign in to pick awards
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted">{lockMessage}</p>
          {lockHref ? (
            <div className="mt-4">
              <Link href={lockHref}>
                <Button type="button">Sign in</Button>
              </Link>
            </div>
          ) : null}
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {catalog.slice(0, 16).map((cat) => (
            <li
              key={cat.id}
              className="border border-line bg-panel px-3 py-3 text-sm text-muted"
            >
              {cat.label}
            </li>
          ))}
        </ul>
        {catalog.length > 16 ? (
          <p className="mt-3 text-xs text-muted">
            +{catalog.length - 16} more after you sign in
          </p>
        ) : null}
      </section>
    );
  }

  return (
      <section>
      <BallotChapterHeader
        eyebrow="Categories"
        title="Award picks"
        description={description}
        actions={actions}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">Search categories</span>
          <input
            type="search"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search categories"
            className="w-full border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <CategoryGroupFilterButton
          value={listGroup}
          options={listFilterOptions}
          onChange={setListGroup}
        />
        <Button
          type="button"
          variant="bordered"
          size="sm"
          disabled={!canAdd}
          onClick={() => setPickerOpen(true)}
        >
          Add category
        </Button>
      </div>

      {added.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No award picks yet. Add a category to start.
        </p>
      ) : filteredAdded.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No categories match that search.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {filteredAdded.map((cat) => {
            const selected = value.find((v) => v.categoryId === cat.id);
            const group = parseAwardCategoryGroup(cat.categoryGroup);
            const eligibility = parseAwardCategoryEligibility(cat.eligibility);
            const hintParts = [AWARD_CATEGORY_GROUP_LABEL[group]];
            if (eligibility !== "current_year") {
              hintParts.push(AWARD_CATEGORY_ELIGIBILITY_LABEL[eligibility]);
            }
            const hint = hintParts.join(" · ");
            return (
              <div key={cat.id} className="py-6">
                {selected ? (
                  <CategoryPickCard
                    label={cat.label}
                    description={cat.description ?? hint}
                    title={selected.title}
                    coverUrl={selected.coverUrl}
                    onClear={() => clear(cat.id)}
                  />
                ) : (
                  <div>
                    <CategoryVoteHeading
                      label={cat.label}
                      description={cat.description ?? hint}
                    />
                    <div className="mt-4">
                      <GameSearchField
                        year={year}
                        eligibility={eligibility}
                        allowEditions={cat.allowEditions === true}
                        onSelect={(hit) => pick(cat.id, hit)}
                        aria-label={`Search games for ${cat.label}`}
                        placeholder={`Search games for ${cat.label}`}
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-sm text-muted hover:text-ink"
                      onClick={() => removeCategory(cat.id)}
                    >
                      Remove category
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canAdd ? (
        <div className="mt-8">
          <Button
            type="button"
            variant="bordered"
            onClick={() => setPickerOpen(true)}
          >
            Add category
          </Button>
        </div>
      ) : null}

      <Dialog
        open={pickerOpen}
        title="Add a category"
        onClose={() => setPickerOpen(false)}
        className="w-full max-w-3xl"
      >
        <p className="mt-2 text-sm text-muted">
          Choose an award to add to your list.
        </p>
        <CategoryPickerGrid unused={unused} onAdd={addCategory} />
      </Dialog>
    </section>
  );
}

function CategoryGroupFilterButton({
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

function CategoryPickerGrid({
  unused,
  onAdd,
}: {
  unused: AwardCategoryOption[];
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
