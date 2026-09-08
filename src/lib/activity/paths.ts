import {
  DEFAULT_TRENDING_WINDOW_HOURS,
  parseTrendingWindowHours,
  type TrendingWindowHours,
} from "@/lib/activity/trending";

export type FollowingView =
  | "following"
  | "followers"
  | "discover"
  | "activity"
  | "trending";

export function trendingHref(opts: {
  hours?: number;
  scope?: "site" | "following";
  communitySlug?: string;
  page?: number;
} = {}): string {
  const hours = parseTrendingWindowHours(opts.hours);
  const params = new URLSearchParams();
  if (opts.communitySlug) {
    if (hours !== DEFAULT_TRENDING_WINDOW_HOURS) {
      params.set("hours", String(hours));
    }
    if (opts.page != null && opts.page > 1) params.set("page", String(opts.page));
    const qs = params.toString();
    return `/communities/${encodeURIComponent(opts.communitySlug)}/trending${
      qs ? `?${qs}` : ""
    }`;
  }
  params.set("sort", "trending");
  if (hours !== DEFAULT_TRENDING_WINDOW_HOURS) {
    params.set("hours", String(hours));
  }
  if (opts.scope === "following") params.set("scope", "following");
  if (opts.page != null && opts.page > 1) params.set("page", String(opts.page));
  return `/games?${params.toString()}`;
}

export function gamesBrowseHref(opts: {
  q?: string;
  year?: number;
  sort?: string;
  sortDir?: "asc" | "desc";
  releaseStatus?: string;
  hours?: string | number;
  scope?: string;
  page?: number;
} = {}): string {
  const params = new URLSearchParams();
  const sort = opts.sort ?? "popularity";
  if (sort === "trending") {
    params.set("sort", "trending");
    const hours = parseTrendingWindowHours(opts.hours);
    if (hours !== DEFAULT_TRENDING_WINDOW_HOURS) {
      params.set("hours", String(hours));
    }
    if (opts.scope === "following") params.set("scope", "following");
  } else {
    const q = opts.q?.trim();
    if (q) params.set("q", q);
    if (opts.year != null && Number.isFinite(opts.year)) {
      params.set("year", String(opts.year));
    }
    if (sort !== "popularity") params.set("sort", sort);
    if (opts.sortDir && opts.sortDir !== "desc") {
      params.set("sortDir", opts.sortDir);
    }
    if (opts.releaseStatus && opts.releaseStatus !== "all") {
      params.set("releaseStatus", opts.releaseStatus);
    }
  }
  if (opts.page != null && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}

export function followingHref(
  opts: {
    page?: number;
    view?: FollowingView;
    q?: string;
    hours?: number;
  } = {},
): string {
  const params = new URLSearchParams();
  if (opts.view && opts.view !== "activity") params.set("view", opts.view);
  const q = opts.q?.trim();
  if (q) params.set("q", q);
  if (opts.view === "trending") {
    const hours = parseTrendingWindowHours(opts.hours);
    if (hours !== DEFAULT_TRENDING_WINDOW_HOURS) {
      params.set("hours", String(hours));
    }
  }
  if (opts.page != null && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/following?${qs}` : "/following";
}

export function peopleHref(opts: { q?: string } = {}): string {
  const q = opts.q?.trim();
  if (!q) return "/people";
  return `/people?q=${encodeURIComponent(q)}`;
}

export function parseTrendingScope(raw: unknown): "site" | "following" {
  return raw === "following" ? "following" : "site";
}

export function parseFollowingView(raw: unknown): FollowingView {
  if (
    raw === "followers" ||
    raw === "discover" ||
    raw === "following" ||
    raw === "trending"
  ) {
    return raw;
  }
  return "activity";
}

export const TRENDING_WINDOW_OPTIONS: Array<{
  hours: TrendingWindowHours;
  label: string;
}> = [
  { hours: 24, label: "24 hours" },
  { hours: 24 * 7, label: "7 days" },
  { hours: 24 * 30, label: "30 days" },
];
