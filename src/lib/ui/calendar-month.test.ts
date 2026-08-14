import { describe, expect, it } from "vitest";
import {
  addCalendarMonth,
  calendarMonthDays,
  formatDatePickerLabel,
  isIsoDateInRange,
  parseIsoDate,
  toIsoDate,
} from "./calendar-month";

describe("calendar-month", () => {
  it("round-trips ISO dates and rejects invalid days", () => {
    expect(toIsoDate(2026, 10, 1)).toBe("2026-11-01");
    expect(parseIsoDate("2026-11-01")).toEqual({
      year: 2026,
      monthIndex: 10,
      day: 1,
    });
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("nope")).toBeNull();
  });

  it("builds a Sunday-first six-week grid", () => {
    const days = calendarMonthDays(2026, 10);
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({
      iso: "2026-11-01",
      day: 1,
      inMonth: true,
    });
    expect(days[29]).toEqual({
      iso: "2026-11-30",
      day: 30,
      inMonth: true,
    });
    expect(days[30]?.inMonth).toBe(false);
  });

  it("formats the trigger label and month math", () => {
    expect(formatDatePickerLabel("2026-11-01")).toBe("Nov 1, 2026");
    expect(addCalendarMonth(2026, 10, 1)).toEqual({
      year: 2026,
      monthIndex: 11,
    });
    expect(addCalendarMonth(2026, 0, -1)).toEqual({
      year: 2025,
      monthIndex: 11,
    });
  });

  it("compares ISO dates for min/max", () => {
    expect(isIsoDateInRange("2026-12-15", "2026-11-02", "2026-12-20")).toBe(
      true,
    );
    expect(isIsoDateInRange("2026-11-01", "2026-11-02")).toBe(false);
    expect(isIsoDateInRange("2026-12-21", undefined, "2026-12-20")).toBe(false);
  });
});
