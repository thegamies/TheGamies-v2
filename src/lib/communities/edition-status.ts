export const EDITION_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "published",
] as const;

export type EditionStatus = (typeof EDITION_STATUSES)[number];

export type EditionSchedule = {
  opensAt: Date | null | undefined;
  closesAt: Date | null | undefined;
  publishesAt: Date | null | undefined;
};

/** Public ceremony status from schedule timestamps (no stored status column). */
export function computeEditionStatus(
  schedule: EditionSchedule,
  now: Date = new Date(),
): EditionStatus {
  const { opensAt, closesAt, publishesAt } = schedule;
  if (!opensAt || !closesAt || !publishesAt) return "draft";
  const t = now.getTime();
  if (t < opensAt.getTime()) return "scheduled";
  if (t < closesAt.getTime()) return "open";
  if (t < publishesAt.getTime()) return "closed";
  return "published";
}

export function validateEditionSchedule(
  opensAt: Date,
  closesAt: Date,
  publishesAt: Date,
): string | null {
  if (
    Number.isNaN(opensAt.getTime()) ||
    Number.isNaN(closesAt.getTime()) ||
    Number.isNaN(publishesAt.getTime())
  ) {
    return "Pick valid open, close, and publish times.";
  }
  if (!(opensAt.getTime() < closesAt.getTime())) {
    return "Voting must open before it closes.";
  }
  if (!(closesAt.getTime() <= publishesAt.getTime())) {
    return "Results cannot publish before voting closes.";
  }
  return null;
}

export function editionStatusLabel(status: EditionStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Coming soon";
    case "open":
      return "Voting open";
    case "closed":
      return "Voting closed";
    case "published":
      return "Results";
  }
}

/** Section heading on the Edition tab. */
export function editionSectionTitle(status: EditionStatus): string {
  return status === "published" ? "Results" : "Game of the Year";
}

/**
 * Single editorial deck under the Edition heading.
 * No status jargon, no year (year lives beside the title).
 * Published has no deck — the boards speak for themselves.
 */
export function editionDeckCopy(status: EditionStatus): string | null {
  switch (status) {
    case "draft":
      return "This ceremony isn’t open to the public yet.";
    case "scheduled":
      return "Voting hasn’t opened yet.";
    case "open":
      return "Rank your Game of the Year and make your category picks.";
    case "closed":
      return "Ballots are locked. Standings will appear when results are ready.";
    case "published":
      return null;
  }
}

/** Overview link into the featured edition — short, product voice. */
export function editionOverviewLinkLabel(
  year: number,
  status: EditionStatus,
): string {
  switch (status) {
    case "published":
      return `${year} results`;
    case "open":
      return `${year} · Voting open`;
    case "closed":
      return `${year} · Voting closed`;
    case "scheduled":
      return `${year} · Coming soon`;
    case "draft":
      return `${year} edition`;
  }
}

/** Show Edition nav for any non-draft ceremony. */
export function showEditionNav(status: EditionStatus): boolean {
  return status !== "draft";
}

/** Parse `<input type="datetime-local">` value as a local Date. */
export function parseEditionDateTimeInput(
  raw: string,
): { ok: true; date: Date } | { error: string } {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return { error: "Pick a valid date and time." };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "Pick a valid date and time." };
  }
  return { ok: true, date };
}

/** Format a Date for `<input type="datetime-local">` in local time. */
export function formatEditionDateTimeInput(
  date: Date | null | undefined,
): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseEditionYear(
  raw: unknown,
): { ok: true; year: number } | { error: string } {
  const year = Math.floor(Number(raw));
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return { error: "Pick a valid year." };
  }
  return { ok: true, year };
}
