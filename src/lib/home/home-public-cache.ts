import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
} from "@/lib/cloudflare/workers-cache";
import type { HomeBigPictureGame } from "@/components/home/HomeBigPictureBanner";
import type { HomeDiscoverGame } from "@/lib/home/discover-games";
import type { CategoryHighlightWinner } from "@/lib/live-aggregate/category-highlights";

/** Colo-local. TTL is the purge. Session and creator buttons stay live. */
export const HOME_PUBLIC_CACHE_MAX_AGE_SECONDS = 60;

export type HomePublicRow = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  score: number | null;
};

export type HomePublicSection = {
  year: number;
  yearHref: string;
  rows: HomePublicRow[];
  categoryWinners: CategoryHighlightWinner[];
};

/** Dates are ISO strings so the Workers cache JSON round-trips. */
export type HomePublicTgaStored = {
  year: number;
  enabled: boolean;
  opensAt: string | null;
  showStartsAt: string | null;
};

export type HomePublicTga = {
  year: number;
  enabled: boolean;
  opensAt: Date | null;
  showStartsAt: Date | null;
};

export type HomePublicCacheValue = {
  minVisible: number;
  years: number[];
  sections: HomePublicSection[];
  bigPictureGames: HomeBigPictureGame[];
  trendingGames: HomeDiscoverGame[];
  upcomingGames: HomeDiscoverGame[];
  tga: HomePublicTgaStored | null;
};

export type HomePublicPayload = Omit<HomePublicCacheValue, "tga"> & {
  tga: HomePublicTga | null;
  /** False when standings failed and this payload was not stored. */
  standingsReady: boolean;
};

export function homePublicCacheRequest(): Request {
  return new Request("https://thegamies.internal/cache/home-public");
}

function reviveDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isoDate(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

export function storeHomePublicTga(
  tga: HomePublicTga | null,
): HomePublicTgaStored | null {
  if (!tga) return null;
  return {
    year: tga.year,
    enabled: tga.enabled,
    opensAt: isoDate(tga.opensAt),
    showStartsAt: isoDate(tga.showStartsAt),
  };
}

export function reviveHomePublic(
  value: HomePublicCacheValue,
): HomePublicPayload {
  return {
    minVisible: value.minVisible,
    years: value.years,
    sections: value.sections,
    bigPictureGames: value.bigPictureGames,
    trendingGames: value.trendingGames,
    upcomingGames: value.upcomingGames,
    tga: value.tga
      ? {
          year: value.tga.year,
          enabled: value.tga.enabled,
          opensAt: reviveDate(value.tga.opensAt),
          showStartsAt: reviveDate(value.tga.showStartsAt),
        }
      : null,
    standingsReady: true,
  };
}

export async function matchHomePublic(): Promise<HomePublicPayload | null> {
  const hit = await matchWorkersCacheJson<HomePublicCacheValue>(
    homePublicCacheRequest(),
  );
  if (!hit || !Array.isArray(hit.sections)) return null;
  return reviveHomePublic(hit);
}

export async function putHomePublic(value: HomePublicCacheValue): Promise<void> {
  await putWorkersCacheJson(
    homePublicCacheRequest(),
    value,
    HOME_PUBLIC_CACHE_MAX_AGE_SECONDS,
  );
}
