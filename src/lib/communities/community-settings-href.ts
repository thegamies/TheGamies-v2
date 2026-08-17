export type CommunitySettingsTab = "live" | "events" | "community" | "invite";

export function parseCommunitySettingsTab(raw: unknown): CommunitySettingsTab {
  if (raw === "events") return "events";
  if (raw === "community") return "community";
  if (raw === "invite") return "invite";
  return "live";
}

/** Host community settings (`?tab=`). Default tab is Live Rankings. */
export function communitySettingsHref(
  slug: string,
  opts: {
    tab?: CommunitySettingsTab;
  } = {},
) {
  const params = new URLSearchParams();
  const tab = opts.tab ?? "live";
  if (tab === "events") {
    params.set("tab", "events");
  } else if (tab === "community") {
    params.set("tab", "community");
  } else if (tab === "invite") {
    params.set("tab", "invite");
  }
  const qs = params.toString();
  return `/communities/${encodeURIComponent(slug)}/settings${qs ? `?${qs}` : ""}`;
}

/** Host create-event page. */
export function communityCreateEventHref(slug: string) {
  return `/communities/${encodeURIComponent(slug)}/create/event`;
}
