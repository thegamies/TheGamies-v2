/**
 * Old thegamies.gg used `/game` (and `/game/[slug]`). Google still has those
 * URLs indexed; map them onto the current `/games` catalog paths.
 */

type SearchParams = Record<string, string | string[] | undefined>;

function withSearchParams(path: string, searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** `/game` → `/games`, keeping any query string. */
export function legacyGameIndexHref(searchParams: SearchParams = {}): string {
  return withSearchParams("/games", searchParams);
}

/** `/game/[slug]` → `/games/[slug]`, keeping any query string. */
export function legacyGameSlugHref(
  slug: string,
  searchParams: SearchParams = {},
): string {
  return withSearchParams(`/games/${slug}`, searchParams);
}
