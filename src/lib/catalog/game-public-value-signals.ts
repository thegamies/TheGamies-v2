export function gameHasPublicSiteValueFromSignals(input: {
  hasGotyPresence: boolean;
  categoryWinCount: number;
  publicListCount: number;
}): boolean {
  return (
    input.hasGotyPresence ||
    input.categoryWinCount > 0 ||
    input.publicListCount > 0
  );
}

/** Skip the list-items probe when GOTY or a category #1 already qualifies ads. */
export function needsPublicListAdsProbe(input: {
  hasGotyPresence: boolean;
  categoryWinCount: number;
}): boolean {
  return !input.hasGotyPresence && input.categoryWinCount <= 0;
}
