import { LIST_MAX_ITEMS } from "@/lib/lists/schema";

export type RankedGameRef = { gameId: string; rank: number };

export type GotyGameCandidate = {
  id: string;
  year: number | null;
  firstReleaseDate: Date | null;
  versionParentIgdbId: number | null;
  isAdult: boolean;
};

/** Sort by rank and reassign contiguous 1..n. */
export function normalizeRanks(items: RankedGameRef[]): RankedGameRef[] {
  return [...items]
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({ gameId: item.gameId, rank: index + 1 }));
}

export function assertWithinMaxItems(count: number): string | null {
  if (count > LIST_MAX_ITEMS) {
    return `Lists can hold at most ${LIST_MAX_ITEMS} games.`;
  }
  return null;
}

/**
 * GOTY eligibility: matching year when known, released (or unknown date),
 * not a version/edition child, not adult.
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
  if (game.year != null && game.year !== year) {
    return `Only ${year} releases belong on this GOTY list.`;
  }
  if (game.firstReleaseDate && game.firstReleaseDate > now) {
    return "Upcoming titles cannot be added to GOTY lists.";
  }
  return null;
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
