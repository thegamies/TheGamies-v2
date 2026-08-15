export type RankScoreLayout =
  | "overhead"
  | "overhead-tight"
  | "below-cover"
  | "votes-under-title";

export const DEFAULT_RANK_SCORE_LAYOUT: RankScoreLayout = "votes-under-title";

export type StandingCardChrome = {
  /** Rank + score row relative to the cover. */
  row: "above" | "below" | null;
  placeBeforeTitle: boolean;
  reserveTitle: boolean;
  votesUnderTitle: boolean;
  rowGapClass: string;
  titleOffsetClass: string;
  tightRow: boolean;
};

/**
 * Rank / votes / title placement when scores are shown.
 * Product default is `votes-under-title`; other values stay on `/design-system`.
 */
export function standingCardChrome(
  layout: RankScoreLayout,
  hasScore: boolean,
): StandingCardChrome {
  if (!hasScore) {
    return {
      row: null,
      placeBeforeTitle: true,
      reserveTitle: true,
      votesUnderTitle: false,
      rowGapClass: "",
      titleOffsetClass: "mt-2",
      tightRow: false,
    };
  }

  switch (layout) {
    case "overhead-tight":
      return {
        row: "above",
        placeBeforeTitle: false,
        reserveTitle: true,
        votesUnderTitle: false,
        rowGapClass: "mb-0.5",
        titleOffsetClass: "mt-2",
        tightRow: true,
      };
    case "below-cover":
      return {
        row: "below",
        placeBeforeTitle: false,
        reserveTitle: true,
        votesUnderTitle: false,
        rowGapClass: "mt-0.5",
        titleOffsetClass: "mt-0.5",
        tightRow: true,
      };
    case "votes-under-title":
      return {
        row: null,
        placeBeforeTitle: true,
        reserveTitle: false,
        votesUnderTitle: true,
        rowGapClass: "",
        titleOffsetClass: "mt-1",
        tightRow: false,
      };
    default:
      return {
        row: "above",
        placeBeforeTitle: false,
        reserveTitle: true,
        votesUnderTitle: false,
        rowGapClass: "mb-2",
        titleOffsetClass: "mt-2",
        tightRow: false,
      };
  }
}
