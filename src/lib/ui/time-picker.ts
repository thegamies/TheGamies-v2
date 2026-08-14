import { parseIsoDate, toIsoDate, formatDatePickerLabel } from "@/lib/ui/calendar-month";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export const MINUTE_STEP = 5;

export function toHour12(hours24: number): {
  hour12: number;
  period: "am" | "pm";
} {
  const period = hours24 >= 12 ? "pm" : "am";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour12, period };
}

export function toHour24(hour12: number, period: "am" | "pm"): number {
  if (hour12 === 12) return period === "am" ? 0 : 12;
  return period === "am" ? hour12 : hour12 + 12;
}

export function formatTimePickerLabel(hours: number, minutes: number): string {
  const { hour12, period } = toHour12(hours);
  return `${hour12}:${pad2(minutes)} ${period.toUpperCase()}`;
}

export function formatDateTimePickerLabel(value: string): string {
  const parsed = parseIsoDateTime(value);
  if (!parsed) return "";
  return `${formatDatePickerLabel(parsed.date)}, ${formatTimePickerLabel(parsed.hours, parsed.minutes)}`;
}

export function toIsoDateTime(
  date: string,
  hours: number,
  minutes: number,
): string {
  return `${date}T${pad2(hours)}:${pad2(minutes)}`;
}

export function parseIsoDateTime(raw: string): {
  date: string;
  hours: number;
  minutes: number;
} | null {
  const value = raw.trim();
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (match) {
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    if (hours > 23 || minutes > 59) return null;
    if (!parseIsoDate(match[1])) return null;
    return { date: match[1], hours, minutes };
  }
  if (parseIsoDate(value)) {
    return { date: value, hours: 0, minutes: 0 };
  }
  return null;
}

export function addMinutesToDateTime(value: string, delta: number): string {
  const parsed = parseIsoDateTime(value);
  if (!parsed) return "";
  const [year, month, day] = parsed.date.split("-").map(Number);
  const date = new Date(year, month - 1, day, parsed.hours, parsed.minutes);
  date.setMinutes(date.getMinutes() + delta);
  return toIsoDateTime(
    toIsoDate(date.getFullYear(), date.getMonth(), date.getDate()),
    date.getHours(),
    date.getMinutes(),
  );
}

export function datePart(value: string): string {
  return value.slice(0, 10);
}

export function timePart(value: string): string {
  const parsed = parseIsoDateTime(value);
  if (!parsed) return "";
  return toIsoTime(parsed.hours, parsed.minutes);
}

export function toIsoTime(hours: number, minutes: number): string {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function parseIsoTime(
  raw: string,
): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function isIsoDateTimeInRange(
  value: string,
  min?: string,
  max?: string,
): boolean {
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
}

export function minuteChoices(current?: number): number[] {
  const steps: number[] = [];
  for (let m = 0; m < 60; m += MINUTE_STEP) steps.push(m);
  if (
    current != null &&
    current >= 0 &&
    current <= 59 &&
    current % MINUTE_STEP !== 0 &&
    !steps.includes(current)
  ) {
    steps.push(current);
    steps.sort((a, b) => a - b);
  }
  return steps;
}

export function isTimeInRange(
  hours: number,
  minutes: number,
  minTime?: string,
  maxTime?: string,
): boolean {
  const value = `${pad2(hours)}:${pad2(minutes)}`;
  if (minTime && value < minTime) return false;
  if (maxTime && value > maxTime) return false;
  return true;
}

export function firstTimeInRange(
  hours: number,
  minTime?: string,
  maxTime?: string,
  currentMinutes = 0,
): number | null {
  if (isTimeInRange(hours, currentMinutes, minTime, maxTime)) {
    return currentMinutes;
  }
  for (let minute = 0; minute < 60; minute += 1) {
    if (isTimeInRange(hours, minute, minTime, maxTime)) return minute;
  }
  return null;
}

/** Three copies of a wheel so scroll can wrap without a seam. */
export const TIME_LOOP_COPIES = 3;

/** Keep scroll inside the middle copy of a 3-copy loop. */
export function wrapLoopScrollTop(
  scrollTop: number,
  cycleHeight: number,
): number {
  if (cycleHeight <= 0) return scrollTop;
  const middle = cycleHeight;
  const last = cycleHeight * 2;
  let top = scrollTop;
  while (top < middle) top += cycleHeight;
  while (top >= last) top -= cycleHeight;
  return top;
}

/** Scroll offset that puts `selectedIndex` at the top of the middle copy. */
export function loopSelectedTopOffset(
  selectedIndex: number,
  itemCount: number,
  itemHeight: number,
): number {
  const index = ((selectedIndex % itemCount) + itemCount) % itemCount;
  return (itemCount + index) * itemHeight;
}
