/**
 * Community live score visibility from `scoresVisibleFrom`.
 * Null / unset = scores hidden for every year. Visible when now >= that instant.
 */
export function isCommunityLiveScoresRevealed(
  scoresVisibleFrom: Date | null | undefined,
  opts: { now?: Date } = {},
): boolean {
  if (!scoresVisibleFrom) return false;
  const now = opts.now ?? new Date();
  return now.getTime() >= scoresVisibleFrom.getTime();
}

/** Parse an HTML date input (YYYY-MM-DD) as UTC midnight. */
export function parseScoresVisibleDateInput(
  raw: string,
): { ok: true; date: Date } | { error: string } {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "Pick a valid date." };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Pick a valid date." };
  }
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) {
    return { error: "Pick a valid date." };
  }
  return { ok: true, date };
}

export function formatScoresVisibleDateInput(
  date: Date | null | undefined,
): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
