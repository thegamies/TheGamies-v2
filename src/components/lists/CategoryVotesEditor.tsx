"use client";

import { useMemo, useState } from "react";
import { type GameSearchHit } from "@/app/create/search-actions";
import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { CategoryPickCard, CategoryVoteHeading } from "@/components/ui/CategoryPickCard";
import { GameSearchField } from "@/components/ui/GameSearchField";
import { SectionRule } from "@/components/ui/SectionRule";
import { fieldInputClass } from "@/components/ui/controls";
import { navItemClass } from "@/components/ui/navLevels";
import {
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
  AWARD_CATEGORY_GROUPS,
  parseAwardCategoryEligibility,
  parseAwardCategoryGroup,
  type AwardCategoryGroup,
} from "@/lib/live-aggregate/award-category-defs";

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
};

function sortedCategories(categories: AwardCategoryOption[]) {
  return [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
  );
}

export function CategoryVotesEditor({
  categories,
  value,
  onChange,
  year,
  description = "Add the awards you want to pick. Search is limited to each category’s eligibility.",
}: Props) {
  const catalog = useMemo(() => sortedCategories(categories), [categories]);
  const [openIds, setOpenIds] = useState<string[]>(() =>
    value.map((v) => v.categoryId),
  );

  const visibleIds = useMemo(() => {
    const ids = new Set(openIds);
    for (const vote of value) ids.add(vote.categoryId);
    return catalog.filter((c) => ids.has(c.id)).map((c) => c.id);
  }, [catalog, openIds, value]);

  const unused = catalog.filter((c) => !visibleIds.includes(c.id));

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
  }

  function removeCategory(id: string) {
    clear(id);
    setOpenIds((prev) => prev.filter((openId) => openId !== id));
  }

  if (catalog.length === 0) return null;

  const visible = catalog.filter((c) => visibleIds.includes(c.id));

  return (
    <section>
      <SectionRule />
      <BallotChapterHeader
        className="mt-8"
        eyebrow="Categories"
        title="Award picks"
        description={description}
      />

      {visible.length > 0 ? (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {visible.map((cat) => {
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
      ) : (
        <p className="mt-8 text-sm text-muted">
          No award picks yet. Choose a category below.
        </p>
      )}

      {unused.length > 0 ? (
        <CategoryPickerGrid unused={unused} onAdd={addCategory} />
      ) : null}
    </section>
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
  const [tab, setTab] = useState<"all" | AwardCategoryGroup>("all");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return unused;
    return unused.filter((cat) => {
      const group = parseAwardCategoryGroup(cat.categoryGroup);
      const eligibility = parseAwardCategoryEligibility(cat.eligibility);
      const hay = [
        cat.label,
        cat.description ?? "",
        AWARD_CATEGORY_GROUP_LABEL[group],
        eligibility === "current_year"
          ? ""
          : AWARD_CATEGORY_ELIGIBILITY_LABEL[eligibility],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [needle, unused]);

  const groupsWithRows = AWARD_CATEGORY_GROUPS.filter((group) =>
    filtered.some((cat) => parseAwardCategoryGroup(cat.categoryGroup) === group),
  );

  const visibleTab: "all" | AwardCategoryGroup =
    tab === "all" || groupsWithRows.includes(tab) ? tab : "all";

  const rows =
    visibleTab === "all"
      ? filtered
      : filtered.filter(
          (cat) => parseAwardCategoryGroup(cat.categoryGroup) === visibleTab,
        );

  const showGroupTag = visibleTab === "all";

  return (
    <div className="mt-10">
      <h3 className="font-display text-2xl tracking-wide text-ink">
        Add a category
      </h3>
      <label className="mt-4 block">
        <span className="sr-only">Search awards</span>
        <input
          className={`${fieldInputClass} mt-0`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search awards"
          autoComplete="off"
        />
      </label>

      <nav
        className="scrollbar-none mt-5 flex flex-nowrap gap-4 overflow-x-auto border-b border-line"
        aria-label="Award groups"
      >
        <button
          type="button"
          className={`shrink-0 ${navItemClass("secondary", visibleTab === "all")}`}
          onClick={() => setTab("all")}
        >
          Show all
        </button>
        {groupsWithRows.map((group) => (
          <button
            key={group}
            type="button"
            className={`shrink-0 ${navItemClass("secondary", visibleTab === group)}`}
            onClick={() => setTab(group)}
          >
            {AWARD_CATEGORY_GROUP_LABEL[group]}
          </button>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No awards match that search.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
          {rows.map((cat) => {
            const group = parseAwardCategoryGroup(cat.categoryGroup);
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
                      {AWARD_CATEGORY_GROUP_LABEL[group]}
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
