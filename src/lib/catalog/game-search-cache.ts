import {
  matchWorkersCacheJson,
  putWorkersCacheJson,
} from "@/lib/cloudflare/workers-cache";
import type { GameSearchHit } from "@/lib/lists/game-search-hit";

/** Colo-local. A newly listed game changes catalogGameCount and misses. */
export const GAME_SEARCH_CACHE_MAX_AGE_SECONDS = 300;

export const GAME_SEARCH_CACHE_LIMIT = 24;

export type GameSearchCacheKeyInput = {
  q: string;
  year?: number;
  gotyMode?: boolean;
  eligibility?: string;
  allowEditions?: boolean;
  allowDlcAddon?: boolean;
  catalogGameCount: number | null;
};

export function shouldCacheGameSearchQuery(q: string): boolean {
  return q.trim().length >= 2;
}

export function gameSearchCacheRequest(input: GameSearchCacheKeyInput): Request {
  const params = new URLSearchParams();
  params.set("q", input.q.trim().toLowerCase());
  if (input.year != null && Number.isFinite(input.year)) {
    params.set("year", String(Math.floor(input.year)));
  }
  params.set("goty", input.gotyMode ? "1" : "0");
  const eligibility = input.eligibility?.trim();
  if (eligibility) params.set("el", eligibility);
  params.set("ed", input.allowEditions ? "1" : "0");
  params.set("dlc", input.allowDlcAddon ? "1" : "0");
  params.set("limit", String(GAME_SEARCH_CACHE_LIMIT));
  if (input.catalogGameCount != null) {
    params.set("count", String(input.catalogGameCount));
  }
  return new Request(
    `https://thegamies.internal/cache/game-search?${params.toString()}`,
  );
}

export async function matchGameSearchHits(
  input: GameSearchCacheKeyInput,
): Promise<GameSearchHit[] | null> {
  return matchWorkersCacheJson<GameSearchHit[]>(gameSearchCacheRequest(input));
}

export async function putGameSearchHits(
  input: GameSearchCacheKeyInput,
  value: GameSearchHit[],
): Promise<void> {
  await putWorkersCacheJson(
    gameSearchCacheRequest(input),
    value,
    GAME_SEARCH_CACHE_MAX_AGE_SECONDS,
  );
}
