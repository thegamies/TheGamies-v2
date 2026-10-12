import { createDb, readCatalogGameCount } from "@thegamies/db";
import { browseGames } from "@/lib/catalog";
import {
  GAME_SEARCH_CACHE_LIMIT,
  matchGameSearchHits,
  putGameSearchHits,
  shouldCacheGameSearchQuery,
  type GameSearchCacheKeyInput,
} from "@/lib/catalog/game-search-cache";
import { parseAwardCategoryEligibility } from "@/lib/live-aggregate/award-category-defs";
import { browseInputForCategoryEligibility } from "@/lib/live-aggregate/category-eligibility";
import type {
  GameSearchHit,
  SearchGamesForListInput,
} from "@/lib/lists/game-search-hit";

function searchCacheKeyInput(
  input: SearchGamesForListInput,
  q: string,
  catalogGameCount: number | null,
): GameSearchCacheKeyInput {
  return {
    q,
    year: input.year,
    gotyMode: input.gotyMode,
    eligibility: input.eligibility,
    allowEditions: input.allowEditions,
    allowDlcAddon: input.allowDlcAddon,
    catalogGameCount,
  };
}

async function searchGamesForListFromDb(
  input: SearchGamesForListInput,
  q: string,
): Promise<GameSearchHit[]> {
  const year = input.year;
  const eligibility = parseAwardCategoryEligibility(input.eligibility);
  const allowEditions = input.allowEditions === true;

  const categoryBrowse =
    year != null && input.eligibility
      ? browseInputForCategoryEligibility(
          year,
          eligibility,
          allowEditions,
          input.allowDlcAddon === true,
        )
      : null;

  const rows = await browseGames({
    q: q.length >= 2 ? q : undefined,
    ...(categoryBrowse ?? {
      year,
      releaseStatus: input.gotyMode ? "released" : "all",
      excludeEditions: Boolean(input.gotyMode),
      gotyEligibleTypes: Boolean(input.gotyMode),
    }),
    sort: "popularity",
    sortDir: "desc",
    limit: GAME_SEARCH_CACHE_LIMIT,
  });

  return rows.map((r) => ({
    id: r.id,
    igdbId: r.igdbId,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: r.coverUrl,
  }));
}

export async function searchGamesForList(
  input: SearchGamesForListInput,
): Promise<GameSearchHit[]> {
  const q = input.q.trim();
  if (!shouldCacheGameSearchQuery(q)) {
    return searchGamesForListFromDb(input, q);
  }

  const catalogGameCount = await readCatalogGameCount(createDb());
  const cacheInput = searchCacheKeyInput(input, q, catalogGameCount);
  const hit = await matchGameSearchHits(cacheInput);
  if (hit) return hit;

  const rows = await searchGamesForListFromDb(input, q);
  await putGameSearchHits(cacheInput, rows);
  return rows;
}
