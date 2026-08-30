import { PROFILE_LIST_PREVIEW_ITEM_LIMIT } from "@/lib/profile/profile-page";

export type ProfileListPreviewItem = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  rank: number;
};

export type ProfileListPreview = {
  publicId: string;
  title: string;
  year: number | null;
  listType: string;
  slug: string | null;
  items: ProfileListPreviewItem[];
};

export type ProfileListsPage = {
  lists: ProfileListPreview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Defense in depth — SQL already LIMITs; never render more than the preview cap. */
export function takePreviewItems<T>(
  items: T[],
  limit: number = PROFILE_LIST_PREVIEW_ITEM_LIMIT,
): T[] {
  return items.slice(0, Math.max(0, limit));
}

export function groupPreviewItemsByListId(
  rows: Array<{ listId: string } & ProfileListPreviewItem>,
  limit: number = PROFILE_LIST_PREVIEW_ITEM_LIMIT,
): Map<string, ProfileListPreviewItem[]> {
  const byListId = new Map<string, ProfileListPreviewItem[]>();
  for (const row of rows) {
    const bucket = byListId.get(row.listId) ?? [];
    if (bucket.length >= limit) continue;
    bucket.push({
      gameId: row.gameId,
      slug: row.slug,
      title: row.title,
      coverUrl: row.coverUrl,
      rank: row.rank,
    });
    byListId.set(row.listId, bucket);
  }
  return byListId;
}

export function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
