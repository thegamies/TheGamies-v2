export function isCompleteTgaSheet(
  categoryIds: string[],
  picks: Record<string, string>,
  worldPremieresGuess: number | null,
): boolean {
  if (
    worldPremieresGuess == null ||
    !Number.isInteger(worldPremieresGuess) ||
    worldPremieresGuess < 0 ||
    worldPremieresGuess > 200
  ) {
    return false;
  }
  if (categoryIds.length === 0) return false;
  return categoryIds.every((id) => Boolean(picks[id]));
}
