export type ProfileTab = "lists" | "communities";

export const PROFILE_LISTS_PAGE_SIZE = 12;
export const PROFILE_COMMUNITIES_PAGE_SIZE = 24;
export const PROFILE_LIST_PREVIEW_ITEM_LIMIT = 5;

export function parseProfileTab(raw: unknown): ProfileTab {
  return raw === "communities" ? "communities" : "lists";
}

export function parseProfilePage(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value ?? "1");
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

/** Clamp a 1-based page against a total row count. */
export function paginateProfileItems(
  pageRaw: number,
  total: number,
  pageSize: number,
): { page: number; offset: number; totalPages: number } {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / size));
  const parsed = Number.isFinite(pageRaw) ? Math.floor(pageRaw) : 1;
  const page = Math.min(totalPages, Math.max(1, parsed));
  return { page, offset: (page - 1) * size, totalPages };
}

export function profileHref(
  username: string,
  opts: { tab?: ProfileTab; page?: number } = {},
): string {
  const params = new URLSearchParams();
  const tab = opts.tab ?? "lists";
  if (tab === "communities") {
    params.set("tab", "communities");
  }
  if (opts.page != null && opts.page > 1) {
    params.set("page", String(opts.page));
  }
  const qs = params.toString();
  return `/u/${encodeURIComponent(username)}${qs ? `?${qs}` : ""}`;
}
