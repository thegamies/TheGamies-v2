const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatClock(at: Date, locale: string): string {
  return at.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(at: Date, now: Date, locale: string): string {
  const sameYear = at.getFullYear() === now.getFullYear();
  return at.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Viewer-local stamp for a feed card. Uses the latest event in a grouped card. */
export function formatFeedEventTime(
  at: Date,
  now = new Date(),
  locale = "en-US",
): string {
  const age = now.getTime() - at.getTime();
  if (!Number.isFinite(age) || age < 0) {
    return `${formatDay(at, now, locale)}, ${formatClock(at, locale)}`;
  }
  if (age < MINUTE) return "Just now";
  if (age < HOUR) {
    const minutes = Math.max(1, Math.round(age / MINUTE));
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const dayDiff = Math.round(
    (startOfLocalDay(now) - startOfLocalDay(at)) / (24 * HOUR),
  );
  const clock = formatClock(at, locale);
  if (dayDiff === 0) {
    const hours = Math.max(1, Math.round(age / HOUR));
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (dayDiff === 1) return `Yesterday, ${clock}`;
  return `${formatDay(at, now, locale)}, ${clock}`;
}

/** Clock only — used under each game on a day-grouped feed card. */
export function formatFeedGameClock(at: Date, locale = "en-US"): string {
  return formatClock(at, locale);
}
