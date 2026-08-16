"use server";

import { searchGamesForList as searchGamesForListImpl } from "@/lib/lists/search-games";
import type { SearchGamesForListInput } from "@/lib/lists/game-search-hit";

export type { GameSearchHit } from "@/lib/lists/game-search-hit";

export async function searchGamesForList(input: SearchGamesForListInput) {
  return searchGamesForListImpl(input);
}
