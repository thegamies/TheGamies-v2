export const DEFAULT_PUBLIC_BOARD_MIN_LISTS = 5;
export const DEFAULT_PUBLIC_BOARD_MIN_CATEGORY_VOTES = 5;
export const PUBLIC_BOARD_MIN_LISTS_MAX = 1000;

/** True when a GOTY year (or category year) may appear on public boards. */
export function isPublicBoardReady(count: number, min: number): boolean {
  const n = Number.isFinite(count) ? count : 0;
  const floor = Number.isFinite(min) ? min : DEFAULT_PUBLIC_BOARD_MIN_LISTS;
  return n >= floor;
}

export function parsePublicBoardMinLists(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PUBLIC_BOARD_MIN_LISTS;
  return Math.min(n, PUBLIC_BOARD_MIN_LISTS_MAX);
}

export function parsePublicBoardMinCategoryVotes(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_PUBLIC_BOARD_MIN_CATEGORY_VOTES;
  }
  return Math.min(n, PUBLIC_BOARD_MIN_LISTS_MAX);
}
