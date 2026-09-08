import { YEAR_PICKER_MIN } from "@/lib/ui/calendar-year";
import type { BrowseSort, ReleaseStatus } from "@/lib/catalog";

export type GamesBrowseSort = BrowseSort | "trending";

/** Empty year = no year filter (all years). */
export const ALL_YEARS_VALUE = "";

/** Newest first, through 1970 — same range as the prior Games browse. */
export function browseYearOptions(
  nowYear = new Date().getUTCFullYear(),
): number[] {
  const max = nowYear + 2;
  const years: number[] = [];
  for (let y = max; y >= YEAR_PICKER_MIN; y -= 1) years.push(y);
  return years;
}

export const BROWSE_SORT_OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: "popularity", label: "Popularity" },
  { value: "name", label: "Name" },
  { value: "first_release_date", label: "Release date" },
];

export const GAMES_BROWSE_SORT_OPTIONS: {
  value: GamesBrowseSort;
  label: string;
}[] = [...BROWSE_SORT_OPTIONS, { value: "trending", label: "Trending" }];

export function parseGamesBrowseSort(raw: unknown): GamesBrowseSort {
  if (raw === "trending") return "trending";
  if (raw === "name" || raw === "first_release_date") return raw;
  return "popularity";
}

export function isCatalogBrowseSort(sort: GamesBrowseSort): sort is BrowseSort {
  return sort !== "trending";
}

export const BROWSE_SORT_DIR_OPTIONS: { value: "asc" | "desc"; label: string }[] =
  [
    { value: "desc", label: "Desc" },
    { value: "asc", label: "Asc" },
  ];

export const BROWSE_RELEASE_OPTIONS: {
  value: ReleaseStatus;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "released", label: "Released" },
  { value: "upcoming", label: "Upcoming" },
];
