export type CommunityNavActive =
  | "overview"
  | "live"
  | "edition"
  | "members"
  | "settings";

/**
 * Which community masthead chip is active from the URL path.
 * `/create/event` sits under Settings.
 */
export function communityNavActiveFromPath(
  pathname: string,
  slug: string,
): CommunityNavActive {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const bases = [
    `/communities/${slug}`,
    `/communities/${encodeURIComponent(slug)}`,
  ];
  const base = bases.find((b) => trimmed === b || trimmed.startsWith(`${b}/`));
  if (!base) return "overview";
  if (trimmed === base) return "overview";
  const rest = trimmed.slice(base.length);
  if (rest.startsWith("/live")) return "live";
  if (rest.startsWith("/edition")) return "edition";
  if (rest.startsWith("/members")) return "members";
  if (rest.startsWith("/settings") || rest.startsWith("/create/event")) {
    return "settings";
  }
  return "overview";
}
