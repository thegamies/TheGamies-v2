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
