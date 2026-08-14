import {
  YEAR_PICKER_MAX,
  YEAR_PICKER_MIN,
} from "@/lib/ui/calendar-year";

export const EDITION_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "published",
] as const;

export type EditionStatus = (typeof EDITION_STATUSES)[number];

export type EditionSchedule = {
  opensAt?: Date | null;
  closesAt?: Date | null;
  publishesAt?: Date | null;
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
    return "Pick valid open, close, and publish dates.";
  }
  if (!(opensAt.getTime() < closesAt.getTime())) {
    return "Voting must open before it closes.";
  }
  if (!(closesAt.getTime() <= publishesAt.getTime())) {
    return "Results cannot publish before voting closes.";
  }
  return null;
}

const STATUS_RANK: Record<EditionStatus, number> = {
  draft: 0,
  scheduled: 1,
  open: 2,
  closed: 3,
  published: 4,
};

/**
 * Confirm-before-save copy when new dates would change the live event status.
 * Draft → coming soon or already open (open date in the past / now) is a
 * normal first save and is not warned.
 */
export function editionScheduleSaveWarning(
  previousStatus: EditionStatus,
  nextStatus: EditionStatus,
): string | null {
  if (previousStatus === nextStatus) return null;
  if (
    previousStatus === "draft" &&
    (nextStatus === "scheduled" || nextStatus === "open")
  ) {
    return null;
  }

  if (STATUS_RANK[nextStatus] < STATUS_RANK[previousStatus]) {
    if (previousStatus === "published") {
      return "These dates will hide results that are already live.";
    }
    if (previousStatus === "closed") {
      return "These dates will reopen voting after it has closed.";
    }
    if (previousStatus === "open") {
      return "These dates will take voting back to coming soon.";
    }
    return "These dates will change the event’s current status.";
  }

  if (nextStatus === "open") {
    return "These dates will open voting immediately.";
  }
  if (nextStatus === "closed") {
    return previousStatus === "scheduled" || previousStatus === "draft"
      ? "These dates will skip open voting and close immediately."
      : "These dates will close voting immediately.";
  }
  if (nextStatus === "published") {
    return "These dates will publish results immediately.";
  }
  return "These dates will change the event’s current status.";
}

/** Public nav / section label. Code and URLs stay `edition`. */
export const EDITION_PUBLIC_LABEL = "Events";

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

/**
 * Single editorial deck under the Events heading.
 * No status jargon. Year lives in the awards title (`editionOverviewTitle`).
 * Published has no deck — the boards speak for themselves.
 */
export function editionDeckCopy(
  status: EditionStatus,
  schedule: EditionSchedule = {},
): string | null {
  switch (status) {
    case "draft":
      return "This ceremony isn’t open to the public yet.";
    case "scheduled": {
      const when = validScheduleTime(schedule.opensAt);
      return when
        ? `Voting opens ${formatEditionScheduleTime(when)}.`
        : "Voting hasn’t opened yet.";
    }
    case "open": {
      const when = validScheduleTime(schedule.closesAt);
      return when
        ? `Voting closes ${formatEditionScheduleTime(when)}.`
        : "Rank your Game of the Year and make your category picks.";
    }
    case "closed": {
      const when = validScheduleTime(schedule.publishesAt);
      return when
        ? `Results reveal ${formatEditionScheduleTime(when)}.`
        : "Ballots are locked. Standings will appear when results are ready.";
    }
    case "published":
      return null;
  }
}

/** Overview awards title — year + show name, not “Events”. */
export function editionOverviewTitle(year: number): string {
  return `${year} Video Game Awards`;
}

export function editionBallotCountCopy(count: number): string {
  const n = Math.max(0, Math.floor(count));
  return n === 1 ? "1 ballot submitted" : `${n} ballots submitted`;
}

/** Public datetime for schedule instants (viewer’s local zone). */
export function formatEditionScheduleTime(
  date: Date,
  timeZone?: string,
): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

function validScheduleTime(date: Date | null | undefined): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

/** Instant shown on the overview kicker for this status, if any. */
export function editionOverviewStatusTime(
  status: EditionStatus,
  schedule: EditionSchedule = {},
): Date | null {
  if (status === "scheduled") return validScheduleTime(schedule.opensAt);
  if (status === "open") return validScheduleTime(schedule.closesAt);
  if (status === "closed") return validScheduleTime(schedule.publishesAt);
  return null;
}

/** Status on the overview kicker: Community vote · {label}. */
export function editionOverviewStatusLabel(
  status: EditionStatus,
  schedule: EditionSchedule = {},
): string {
  const when = editionOverviewStatusTime(status, schedule);
  if (when) {
    const stamp = formatEditionScheduleTime(when);
    if (status === "scheduled") return `Opens ${stamp}`;
    if (status === "open") return `Closes ${stamp}`;
    if (status === "closed") return `Reveals ${stamp}`;
  }
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Coming Soon";
    case "open":
      return "Voting Open";
    case "closed":
      return "Voting Closed";
    case "published":
      return "Results";
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
      return `${year} event`;
  }
}

/** Show Edition nav for any non-draft ceremony. */
export function showEditionNav(status: EditionStatus): boolean {
  return status !== "draft";
}

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse `<input type="date">` value as local midnight. */
export function parseEditionDateInput(
  raw: string,
): { ok: true; date: Date } | { error: string } {
  const value = raw.trim();
  if (!DATE_INPUT_RE.test(value)) {
    return { error: "Pick a valid date." };
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { error: "Pick a valid date." };
  }
  return { ok: true, date };
}

/** Format a Date for `<input type="date">` in local time. */
export function formatEditionDateInput(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const parsed = parseEditionDateInput(isoDate);
  if ("error" in parsed) return "";
  const next = new Date(parsed.date.getTime());
  next.setDate(next.getDate() + days);
  return formatEditionDateInput(next);
}

/** Parse `<input type="datetime-local">` value as a local Date. */
export function parseEditionDateTimeInput(
  raw: string,
): { ok: true; date: Date } | { error: string } {
  const value = raw.trim();
  if (!DATETIME_LOCAL_RE.test(value)) {
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
  return `${formatEditionDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Parse a schedule field from a date picker, datetime-local, or ISO instant
 * (“Set to now”).
 */
export function parseEditionScheduleInput(
  raw: string,
): { ok: true; date: Date } | { error: string } {
  const value = raw.trim();
  if (!value) return { error: "Pick a valid date." };
  if (DATE_INPUT_RE.test(value)) return parseEditionDateInput(value);
  if (DATETIME_LOCAL_RE.test(value)) return parseEditionDateTimeInput(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "Pick a valid date." };
  }
  return { ok: true, date };
}

/** min/max for chained Opens → Closes → Results date/time pickers. */
export function editionScheduleDateBounds(fields: {
  opens: string;
  closes: string;
  publishes: string;
}): {
  opensMax?: string;
  closesMin?: string;
  closesMax?: string;
  publishesMin?: string;
} {
  const { opens, closes, publishes } = fields;
  const shift = (raw: string, minutes: number) => {
    const parsed = parseEditionScheduleInput(raw);
    if ("error" in parsed) return "";
    const next = new Date(parsed.date.getTime());
    next.setMinutes(next.getMinutes() + minutes);
    return formatEditionDateTimeInput(next);
  };

  const opensMax = closes
    ? shift(closes, -1)
    : publishes
      ? shift(publishes, -1)
      : "";
  const closesMin = opens ? shift(opens, 1) : "";
  const closesMax = publishes || "";
  const closesRangeOk = !closesMin || !closesMax || closesMin <= closesMax;

  return {
    opensMax: opensMax || undefined,
    closesMin: closesRangeOk ? closesMin || undefined : undefined,
    closesMax: closesRangeOk ? closesMax || undefined : undefined,
    publishesMin: closes
      ? closes
      : opens
        ? shift(opens, 1) || undefined
        : undefined,
  };
}

export function parseEditionYear(
  raw: unknown,
): { ok: true; year: number } | { error: string } {
  const year = Math.floor(Number(raw));
  if (!Number.isFinite(year) || year < YEAR_PICKER_MIN || year > YEAR_PICKER_MAX) {
    return { error: "Pick a valid year." };
  }
  return { ok: true, year };
}

export function editionDeleteConfirmMatches(
  year: number,
  typed: unknown,
): boolean {
  return String(typed ?? "").trim() === String(year);
}
