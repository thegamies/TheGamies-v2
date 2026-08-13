/** Sticky ceremony scrub progress. */

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
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
