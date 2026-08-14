function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toIsoDate(
  year: number,
  monthIndex: number,
  day: number,
): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseIsoDate(
  iso: string,
): { year: number; monthIndex: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [year, month, day] = iso.trim().split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, monthIndex: month - 1, day };
}

export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDatePickerLabel(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return new Date(
    parsed.year,
    parsed.monthIndex,
    parsed.day,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function addCalendarMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function isIsoDateInRange(
  iso: string,
  min?: string,
  max?: string,
): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export type CalendarDay = {
  iso: string;
  day: number;
  inMonth: boolean;
};

/** Six weeks, Sunday-first, covering `year` / `monthIndex` (0–11). */
export function calendarMonthDays(
  year: number,
  monthIndex: number,
): CalendarDay[] {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      iso: toIsoDate(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    });
  }
  return days;
}
