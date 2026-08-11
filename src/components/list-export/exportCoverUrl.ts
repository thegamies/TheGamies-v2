/** Ensure a usable absolute URL (IGDB serves protocol-relative `//images.igdb.com/...`). */
function withProtocol(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

/** Higher-res IGDB covers for export (better detail in the rasterized poster). */
export function exportCoverUrl(url: string): string {
  if (!url) return url;
  return withProtocol(url)
    .replace("/t_cover_big/", "/t_1080p/")
    .replace("/t_cover_small/", "/t_1080p/")
    .replace("/t_thumb/", "/t_1080p/");
}

/** Try hi-res first, then the stored URL, then cover_big — for export inlining fallbacks. */
export function exportCoverFallbackUrls(url: string): string[] {
  if (!url) return [];
  const out: string[] = [];
  const push = (candidate: string) => {
    if (candidate && !out.includes(candidate)) out.push(candidate);
  };
  push(exportCoverUrl(url));
  push(withProtocol(url));
  push(
    withProtocol(url)
      .replace("/t_1080p/", "/t_cover_big/")
      .replace("/t_thumb/", "/t_cover_big/"),
  );
  return out;
}
