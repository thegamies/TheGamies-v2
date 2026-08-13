/** Sticky ceremony scrub progress. */

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Share of GOTY chapter scrub used by the opening title card. */
export const CEREMONY_TITLE_CARD_AT = 0.09;

/** 0 = full title card, 1 = parked sticky header. */
export function ceremonyTitleCardSettle(
  p: number,
  at = CEREMONY_TITLE_CARD_AT,
): number {
  return easeInOut(clamp(p / Math.max(0.001, at), 0, 1));
}

/** Remap chapter progress so ranks start after the title card parks. */
export function ceremonyProgressAfterTitleCard(
  p: number,
  at = CEREMONY_TITLE_CARD_AT,
): number {
  return clamp((p - at) / Math.max(0.001, 1 - at), 0, 1);
}

/**
 * Progress from document scroll — not getBoundingClientRect during sticky.
 * WebKit often reports a stuck/wrong track.top while the sticky child is pinned,
 * which freezes scrub at the first place / first award.
 */
export function ceremonyProgress(
  scrollTop: number,
  trackDocumentTop: number,
  trackHeight: number,
  frameHeight: number,
) {
  const total = Math.max(1, trackHeight - Math.max(1, frameHeight));
  return clamp((scrollTop - trackDocumentTop) / total, 0, 1);
}

/** Sum offsetTop through offsetParent chain (document Y for static layout). */
export function documentOffsetTop(el: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}
