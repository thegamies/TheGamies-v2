/** Max people on a Hosts roster (community, event year, or pick’em year). */
export const COMMUNITY_HOSTS_MAX = 12;

export function communityHostsAtCapacityMessage(
  max: number = COMMUNITY_HOSTS_MAX,
): string {
  return `A Hosts roster can have at most ${max} people.`;
}

/** Null when the add is allowed; otherwise user-facing error copy. */
export function communityHostsCapacityError(
  currentCount: number,
  alreadyOnRoster: boolean,
  max: number = COMMUNITY_HOSTS_MAX,
): string | null {
  if (alreadyOnRoster) return null;
  if (currentCount >= max) return communityHostsAtCapacityMessage(max);
  return null;
}
