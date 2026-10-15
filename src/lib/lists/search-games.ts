import {
  cachedBrowseGames,
  GAME_SEARCH_CACHE_LIMIT,
} from "@/lib/catalog/game-search-cache";
import { parseAwardCategoryEligibility } from "@/lib/live-aggregate/award-category-defs";
import { browseInputForCategoryEligibility } from "@/lib/live-aggregate/category-eligibility";
import type {
  GameSearchHit,
  SearchGamesForListInput,
} from "@/lib/lists/game-search-hit";

export async function searchGamesForList(
  input: SearchGamesForListInput,
): Promise<GameSearchHit[]> {
  const q = input.q.trim();
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

  const rows = await cachedBrowseGames({
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
