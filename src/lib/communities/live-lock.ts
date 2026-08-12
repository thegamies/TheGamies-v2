/** Pure helpers for locked community live standings. */

export function clampLockStandingsPage(
  requested: number,
  totalPages: number,
): number {
  const pages = Math.max(1, Math.floor(totalPages));
  const page = Math.floor(requested);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, pages);
}

export function sliceLockGotyPage<T>(
  rows: T[],
  pageSize: number,
  requestedPage: number,
): { page: number; totalPages: number; rows: T[] } {
  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(rows.length / size) || 1);
  const page = clampLockStandingsPage(requestedPage, totalPages);
  const start = (page - 1) * size;
  return {
    page,
    totalPages,
    rows: rows.slice(start, start + size),
  };
}
