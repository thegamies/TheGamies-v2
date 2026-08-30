import type {
  GameSearchHit,
  SearchGamesForListInput,
} from "@/lib/lists/game-search-hit";

/** Catalog search over a GET route so typing does not refresh the editor. */
export async function searchGamesForList(
  input: SearchGamesForListInput,
): Promise<GameSearchHit[]> {
  const params = new URLSearchParams();
  params.set("q", input.q);
  if (input.year != null) params.set("year", String(input.year));
  if (input.gotyMode) params.set("gotyMode", "1");
  if (input.eligibility) params.set("eligibility", input.eligibility);
  if (input.allowEditions) params.set("allowEditions", "1");

  const res = await fetch(`/api/games/search?${params.toString()}`);
  if (!res.ok) return [];
  const body: unknown = await res.json();
  if (!Array.isArray(body)) return [];
  return body as GameSearchHit[];
}
