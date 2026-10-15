import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
} from "@/lib/cloudflare/workers-cache";
import type { TrendingWindowHours } from "@/lib/activity/trending";

/** Site board only. Following / community boards stay live. */
export const SITE_TRENDING_CACHE_MAX_AGE_SECONDS = 60;

export type SiteTrendingBoardCache = {
  rows: Array<{
    gameId: string;
    slug: string;
    title: string;
    coverUrl: string | null;
  }>;
  windowHours: TrendingWindowHours;
  publicReady: boolean;
  distinctPeople: number;
  total: number;
  page: number;
  totalPages: number;
};

export type SiteTrendingCacheOpts = {
  followerProfileId?: string | null;
  communityId?: string | null;
  recencyWeights?: unknown;
  kindWeights?: unknown;
  now?: Date;
  db?: unknown;
};

export function canUseSiteTrendingWorkersCache(
  opts: SiteTrendingCacheOpts,
): boolean {
  return (
    !opts.followerProfileId &&
    !opts.communityId &&
    opts.db == null &&
    opts.now == null &&
    opts.recencyWeights == null &&
    opts.kindWeights == null
  );
}

export function siteTrendingCacheRequest(input: {
  windowHours: number;
  page: number;
  minPeople: number;
  applySiteFloor: boolean;
}): Request {
  const params = new URLSearchParams({
    hours: String(input.windowHours),
    page: String(input.page),
    min: String(input.minPeople),
    floor: input.applySiteFloor ? "1" : "0",
  });
  return new Request(
    `https://thegamies.internal/cache/site-trending?${params.toString()}`,
  );
}

export async function matchSiteTrendingBoard(
  input: Parameters<typeof siteTrendingCacheRequest>[0],
): Promise<SiteTrendingBoardCache | null> {
  return matchWorkersCacheJson<SiteTrendingBoardCache>(
    siteTrendingCacheRequest(input),
  );
}

export async function putSiteTrendingBoard(
  input: Parameters<typeof siteTrendingCacheRequest>[0],
  value: SiteTrendingBoardCache,
): Promise<void> {
  await putWorkersCacheJson(
    siteTrendingCacheRequest(input),
    value,
    SITE_TRENDING_CACHE_MAX_AGE_SECONDS,
  );
}
