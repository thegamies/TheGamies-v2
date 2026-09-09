import type { GotyGameCandidate } from "@/lib/lists/rules";
import { gotyYearAndReleaseError } from "@/lib/lists/rules";
import { isCategoryEligibleGameType } from "@/lib/igdb-game-types";
import type { AwardCategoryEligibility } from "./award-category-defs";

export type CategoryGameCandidate = GotyGameCandidate;

function releaseYear(game: CategoryGameCandidate): number | null {
  if (game.year != null) return game.year;
  if (game.firstReleaseDate) return game.firstReleaseDate.getUTCFullYear();
  return null;
}

/**
 * Category pick eligibility for a list/ballot year.
 * Any-year means already released and not later than the list year.
 * Upcoming is later years only — not the list year, even if still unreleased.
 */
export function categoryEligibilityError(
  game: CategoryGameCandidate,
  year: number,
  eligibility: AwardCategoryEligibility,
  opts: {
    allowEditions?: boolean;
    allowDlcAddon?: boolean;
    now?: Date;
  } = {},
): string | null {
  const now = opts.now ?? new Date();
  const allowEditions = opts.allowEditions === true;

  if (game.isAdult) {
    return "Adult titles cannot be added to award categories.";
  }
  if (!allowEditions && game.versionParentIgdbId != null) {
    return "Edition or version titles cannot be added to this category.";
  }
  if (
    !isCategoryEligibleGameType(game.gameTypeIgdbId, {
      allowDlcAddon: opts.allowDlcAddon === true,
    })
  ) {
    return "Packs, add-ons, and bundles cannot be added to this category.";
  }

  if (eligibility === "current_year") {
    return gotyYearAndReleaseError(game, year, now);
  }

  if (eligibility === "upcoming") {
    if (game.year != null) {
      if (game.year <= year) {
        return "Only titles from later years belong in this category.";
      }
      return null;
    }
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    if (game.firstReleaseDate != null && game.firstReleaseDate > yearEnd) {
      return null;
    }
    return "Only titles from later years belong in this category.";
  }

  const catalogYear = releaseYear(game);
  if (catalogYear != null && catalogYear > year) {
    return `Only ${year} or earlier releases belong in this category.`;
  }
  if (game.firstReleaseDate && game.firstReleaseDate > now) {
    return "Upcoming titles cannot be added to this category.";
  }
  return null;
}

export function browseInputForCategoryEligibility(
  year: number,
  eligibility: AwardCategoryEligibility,
  allowEditions: boolean,
  allowDlcAddon = false,
): {
  year?: number;
  yearAtMost?: number;
  yearAtLeast?: number;
  yearKnownAtLeast?: number;
  releaseStatus: "released" | "upcoming" | "all";
  excludeEditions: boolean;
  gotyEligibleTypes: true;
  includeDlcAddonType: boolean;
} {
  const excludeEditions = !allowEditions;
  const includeDlcAddonType = allowDlcAddon === true;
  if (eligibility === "current_year") {
    return {
      year,
      releaseStatus: "released",
      excludeEditions,
      gotyEligibleTypes: true,
      includeDlcAddonType,
    };
  }
  if (eligibility === "upcoming") {
    return {
      yearKnownAtLeast: year + 1,
      releaseStatus: "upcoming",
      excludeEditions,
      gotyEligibleTypes: true,
      includeDlcAddonType,
    };
  }
  return {
    yearAtMost: year,
    releaseStatus: "released",
    excludeEditions,
    gotyEligibleTypes: true,
    includeDlcAddonType,
  };
}
