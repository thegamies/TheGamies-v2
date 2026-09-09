export const LIBRARY_STATUSES = [
  "wishlist",
  "backlog",
  "playing",
  "paused",
  "beat",
  "dropped",
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const LIBRARY_VISIBILITIES = ["public", "private"] as const;
export type LibraryVisibility = (typeof LIBRARY_VISIBILITIES)[number];

export const LIST_RANK_VISIBILITIES = [
  "ranked",
  "games_only",
  "hidden",
] as const;

export type ListRankVisibility = (typeof LIST_RANK_VISIBILITIES)[number];

export const ACTIVITY_KINDS = [
  "library_wishlist",
  "library_backlog",
  "library_playing",
  "library_paused",
  "library_beat",
  "library_dropped",
  "library_cleared",
  "list_add",
  "list_remove",
  "list_reveal",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const TRENDING_KINDS = [
  "library_wishlist",
  "library_backlog",
  "library_playing",
  "library_beat",
  "list_add",
] as const;

export type TrendingKind = (typeof TRENDING_KINDS)[number];

const LIBRARY_STATUS_SET = new Set<string>(LIBRARY_STATUSES);
const LIBRARY_VISIBILITY_SET = new Set<string>(LIBRARY_VISIBILITIES);
const RANK_VISIBILITY_SET = new Set<string>(LIST_RANK_VISIBILITIES);
const ACTIVITY_KIND_SET = new Set<string>(ACTIVITY_KINDS);

export function parseLibraryStatus(raw: unknown): LibraryStatus | null {
  if (typeof raw !== "string") return null;
  if (raw === "want") return "backlog";
  if (raw === "played") return "beat";
  return LIBRARY_STATUS_SET.has(raw) ? (raw as LibraryStatus) : null;
}

export function parseLibraryVisibility(raw: unknown): LibraryVisibility {
  return typeof raw === "string" && LIBRARY_VISIBILITY_SET.has(raw)
    ? (raw as LibraryVisibility)
    : "public";
}

export function parseListRankVisibility(raw: unknown): ListRankVisibility {
  return typeof raw === "string" && RANK_VISIBILITY_SET.has(raw)
    ? (raw as ListRankVisibility)
    : "ranked";
}

export function parseActivityKind(raw: unknown): ActivityKind | null {
  if (typeof raw !== "string") return null;
  if (raw === "library_want") return "library_backlog";
  if (raw === "library_played") return "library_beat";
  return ACTIVITY_KIND_SET.has(raw) ? (raw as ActivityKind) : null;
}

export function libraryEventKindForStatus(
  status: LibraryStatus,
): Extract<
  ActivityKind,
  | "library_wishlist"
  | "library_backlog"
  | "library_playing"
  | "library_paused"
  | "library_beat"
  | "library_dropped"
> {
  switch (status) {
    case "wishlist":
      return "library_wishlist";
    case "backlog":
      return "library_backlog";
    case "playing":
      return "library_playing";
    case "paused":
      return "library_paused";
    case "beat":
      return "library_beat";
    case "dropped":
      return "library_dropped";
  }
}

export function isTrendingKind(kind: string): kind is TrendingKind {
  return (TRENDING_KINDS as readonly string[]).includes(kind);
}

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  wishlist: "Wishlist",
  backlog: "Backlog",
  playing: "Playing",
  paused: "Paused",
  beat: "Beat",
  dropped: "Dropped",
};

export function emptyLibraryStatusCounts(): Record<LibraryStatus, number> {
  return {
    wishlist: 0,
    backlog: 0,
    playing: 0,
    paused: 0,
    beat: 0,
    dropped: 0,
  };
}

export function formatFollowLibraryCounts(
  counts: Partial<Record<LibraryStatus, number>>,
): string | null {
  const parts = LIBRARY_STATUSES.flatMap((status) => {
    const n = counts[status] ?? 0;
    if (n < 1) return [];
    return [`${n} ${LIBRARY_STATUS_LABELS[status].toLowerCase()}`];
  });
  if (parts.length === 0) return null;
  return `People you follow: ${parts.join(" · ")}`;
}

export const LIST_RANK_VISIBILITY_LABELS: Record<ListRankVisibility, string> = {
  ranked: "Ranked",
  games_only: "Games only",
  hidden: "Hidden",
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  library_wishlist: "Wishlist",
  library_backlog: "Backlog",
  library_playing: "Playing",
  library_paused: "Paused",
  library_beat: "Beat",
  library_dropped: "Dropped",
  library_cleared: "Removed from library",
  list_add: "Added to Game of the Year",
  list_remove: "Removed from Game of the Year",
  list_reveal: "Ranked a Game of the Year list",
};
