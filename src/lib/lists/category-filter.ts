import {
  AWARD_CATEGORY_ELIGIBILITY_LABEL,
  AWARD_CATEGORY_GROUP_LABEL,
  AWARD_CATEGORY_GROUPS,
  parseAwardCategoryEligibility,
  parseAwardCategoryGroup,
  type StandingsCategoryGroupFilter,
} from "@/lib/live-aggregate/award-category-defs";

export type FilterableAwardCategory = {
  id: string;
  label: string;
  description: string | null;
  sortOrder?: number;
  categoryGroup?: string;
  eligibility?: string;
};

export function sortedAwardCategories<T extends FilterableAwardCategory>(
  categories: T[],
): T[] {
  return [...categories].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
  );
}

/** Search + group filter for award category catalogs (editor list and add dialog). */
export function filterAwardCategories<T extends FilterableAwardCategory>(
  categories: T[],
  opts: { query: string; group: StandingsCategoryGroupFilter },
): T[] {
  const needle = opts.query.trim().toLowerCase();
  return categories.filter((cat) => {
    const group = parseAwardCategoryGroup(cat.categoryGroup);
    if (opts.group !== "all" && group !== opts.group) return false;
    if (!needle) return true;
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
}

export function awardGroupsPresent(
  categories: FilterableAwardCategory[],
): StandingsCategoryGroupFilter[] {
  const present = new Set(
    categories.map((cat) => parseAwardCategoryGroup(cat.categoryGroup)),
  );
  return [
    "all",
    ...AWARD_CATEGORY_GROUPS.filter((group) => present.has(group)),
  ];
}
