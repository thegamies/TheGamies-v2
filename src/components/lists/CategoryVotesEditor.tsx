"use client";

import { useMemo, useState, type ReactNode } from "react";
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
  CategoryGroupFilterButton,
  CategoryPickerGrid,
} from "@/components/lists/CategoryPickerGrid";
import {
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
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
  /**
   * `optional` (default): site GOTY lists — voter adds awards from a catalog.
   * `fixed`: edition ballots — every passed category is always on the ballot.
   */
  catalogMode?: "optional" | "fixed";
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
  catalogMode = "optional",
  locked = false,
  lockHref,
  lockMessage = "Sign in to choose award winners for your GOTY list.",
  actions,
}: Props) {
  const fixedCatalog = catalogMode === "fixed";
  const catalog = useMemo(() => sortedAwardCategories(categories), [categories]);
  const [openIds, setOpenIds] = useState<string[]>(() =>
    value.map((v) => v.categoryId),
  );
  const [listQuery, setListQuery] = useState("");
  const [listGroup, setListGroup] =
    useState<StandingsCategoryGroupFilter>("all");
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleIds = useMemo(() => {
    if (fixedCatalog) return catalog.map((c) => c.id);
    const ids = new Set(openIds);
    for (const vote of value) ids.add(vote.categoryId);
    return catalog.filter((c) => ids.has(c.id)).map((c) => c.id);
  }, [catalog, fixedCatalog, openIds, value]);

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

  const canAdd = !fixedCatalog && unused.length > 0;

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
              <Link href={lockHref} rel="nofollow">
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
        {fixedCatalog ? null : (
          <Button
            type="button"
            variant="bordered"
            size="sm"
            disabled={!canAdd}
            onClick={() => setPickerOpen(true)}
          >
            Add category
          </Button>
        )}
      </div>

      {added.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          {fixedCatalog
            ? "No awards on this event yet."
            : "No award picks yet. Add a category to start."}
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
                    {fixedCatalog ? null : (
                      <button
                        type="button"
                        className="mt-3 text-sm text-muted hover:text-ink"
                        onClick={() => removeCategory(cat.id)}
                      >
                        Remove category
                      </button>
                    )}
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

      {fixedCatalog ? null : (
        <Dialog
          open={pickerOpen}
          title="Add a category"
          onClose={() => setPickerOpen(false)}
          className="w-full max-w-3xl"
        >
          <p className="mt-2 text-sm text-muted">
            Choose an award to add to your list.
          </p>
          <CategoryPickerGrid categories={unused} onSelect={addCategory} />
        </Dialog>
      )}
    </section>
  );
}

