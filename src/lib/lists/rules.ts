import { LIST_MAX_ITEMS } from "@/lib/lists/schema";
import { isGotyEligibleGameType } from "@/lib/igdb-game-types";

export type RankedGameRef = {
  gameId: string;
  rank: number;
  blurb?: string | null;
};

export type GotyGameCandidate = {
  id: string;
  year: number | null;
  firstReleaseDate: Date | null;
  versionParentIgdbId: number | null;
  isAdult: boolean;
  gameTypeIgdbId?: number | null;
};

/** Sort by rank and reassign contiguous 1..n (preserves blurb and other fields). */
export function normalizeRanks<T extends RankedGameRef>(
  items: T[],
): Array<T & { rank: number }> {
  return [...items]
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function assertWithinMaxItems(count: number): string | null {
  if (count > LIST_MAX_ITEMS) {
    return `Lists can hold at most ${LIST_MAX_ITEMS} games.`;
  }
  return null;
}

/** Exact catalog year and a real release date that is not in the future. */
export function gotyYearAndReleaseError(
  game: Pick<GotyGameCandidate, "year" | "firstReleaseDate">,
  year: number,
  now: Date = new Date(),
): string | null {
  if (game.year == null || game.year !== year) {
    return `Only ${year} releases belong on this GOTY list.`;
  }
  if (game.firstReleaseDate == null) {
    return "Titles without a release date cannot be added to GOTY lists.";
  }
  if (game.firstReleaseDate > now) {
    return "Upcoming titles cannot be added to GOTY lists.";
  }
  return null;
}

/**
 * GOTY eligibility: exact year, released with a known date, not a
 * version/edition child, not adult, not pack/DLC/addon-style types.
 */
export function gotyEligibilityError(
  game: GotyGameCandidate,
  year: number,
  now: Date = new Date(),
): string | null {
  if (game.isAdult) {
    return "Adult titles cannot be added to GOTY lists.";
  }
  if (game.versionParentIgdbId != null) {
    return "Edition or version titles cannot be added to GOTY lists.";
  }
  if (!isGotyEligibleGameType(game.gameTypeIgdbId)) {
    return "Packs, add-ons, and bundles cannot be added to GOTY lists.";
  }
  return gotyYearAndReleaseError(game, year, now);
}

/** Client-side GOTY filter (exact year + already released with a known date). */
export function isAllowedOnGotyList(
  game: { year: number | null; firstReleaseDate?: Date | null },
  gotyYear: number,
  now: Date = new Date(),
): boolean {
  return gotyYearAndReleaseError(
    { year: game.year, firstReleaseDate: game.firstReleaseDate ?? null },
    gotyYear,
    now,
  ) == null;
}

/** Slug for owned custom lists. */
export function slugifyListTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || "list";
}

export function gotySlugForYear(year: number): string {
  return `goty-${year}`;
}
