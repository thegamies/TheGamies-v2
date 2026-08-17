export type CommunitySettingsTab = "live" | "events" | "community";

export function parseCommunitySettingsTab(raw: unknown): CommunitySettingsTab {
  if (raw === "events") return "events";
  if (raw === "community") return "community";
  return "live";
}

/** Host community settings (`?tab=` / `?year=`). Default tab is Live Rankings. */
export function communitySettingsHref(
  slug: string,
  opts: {
    tab?: CommunitySettingsTab;
    year?: number | null;
  } = {},
) {
  const params = new URLSearchParams();
  const tab = opts.tab ?? "live";
  if (tab === "events") {
    params.set("tab", "events");
    if (opts.year != null) params.set("year", String(opts.year));
  } else if (tab === "community") {
    params.set("tab", "community");
  }
  const qs = params.toString();
  return `/communities/${encodeURIComponent(slug)}/settings${qs ? `?${qs}` : ""}`;
}

/**
 * Year for the Events tab: requested year if it exists, else featured, else latest.
 */
export function pickSettingsEditionYear(
  years: number[],
  requestedYear: number | null,
  featuredYear: number | null,
): number | null {
  if (years.length === 0) return null;
  const set = new Set(years);
  if (requestedYear != null && set.has(requestedYear)) return requestedYear;
  if (featuredYear != null && set.has(featuredYear)) return featuredYear;
  return [...years].sort((a, b) => b - a)[0] ?? null;
}
