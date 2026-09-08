import {
  parseStoredRankVisibility,
  type ListRankVisibility,
} from "@/lib/lists/schema";

export function viewerCanOpenList(
  visibility: string | null | undefined,
  isEditor: boolean,
): boolean {
  if (isEditor) return true;
  return parseStoredRankVisibility(visibility) !== "hidden";
}

export function viewerSeesListRanks(
  visibility: string | null | undefined,
  isEditor: boolean,
): boolean {
  if (isEditor) return true;
  return parseStoredRankVisibility(visibility) === "ranked";
}

export function viewerSeesListCategories(
  visibility: string | null | undefined,
  isEditor: boolean,
): boolean {
  return viewerSeesListRanks(visibility, isEditor);
}

export function listPublicIndexable(
  visibility: string | null | undefined,
): boolean {
  return parseStoredRankVisibility(visibility) !== "hidden";
}

/** Games-only public views must not leak rank order. */
export function orderItemsForPublicView<T extends { title: string }>(
  items: readonly T[],
  hideRanks: boolean,
): T[] {
  if (!hideRanks) return [...items];
  return [...items].sort((a, b) => a.title.localeCompare(b.title));
}

export function listRankVisibilityLabel(
  visibility: ListRankVisibility,
): string {
  switch (visibility) {
    case "ranked":
      return "Ranked";
    case "games_only":
      return "Games only";
    case "hidden":
      return "Hidden";
  }
}
