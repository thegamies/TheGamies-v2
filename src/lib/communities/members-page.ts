export const COMMUNITY_MEMBERS_PAGE_SIZE = 50;

/** Clamp a 1-based page against a total row count. */
export function paginateCommunityMembers(
  pageRaw: number,
  total: number,
  pageSize: number = COMMUNITY_MEMBERS_PAGE_SIZE,
): { page: number; offset: number; totalPages: number } {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / size));
  const parsed = Number.isFinite(pageRaw) ? Math.floor(pageRaw) : 1;
  const page = Math.min(totalPages, Math.max(1, parsed));
  return { page, offset: (page - 1) * size, totalPages };
}
