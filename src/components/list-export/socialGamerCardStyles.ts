/** Cover proportions for a single card (3:4). */
export const SOCIAL_GAMER_CARD_ASPECT = 3 / 4;

export function socialGamerCardHeight(width: number): number {
  return Math.round(width / SOCIAL_GAMER_CARD_ASPECT);
}
