import { describe, expect, it } from "vitest";
import {
  firstTimeInRange,
  formatTimePickerLabel,
  formatDateTimePickerLabel,
  isTimeInRange,
  minuteChoices,
  parseIsoDateTime,
  parseIsoTime,
  toHour12,
  toHour24,
  toIsoDateTime,
  toIsoTime,
  addMinutesToDateTime,
  wrapLoopScrollTop,
  loopSelectedTopOffset,
  mergeIsoDateAndTime,
  clampIsoDateTime,
  wallClockToIso,
} from "./time-picker";

describe("time-picker", () => {
  it("converts 12-hour and 24-hour clocks", () => {
    expect(toHour12(0)).toEqual({ hour12: 12, period: "am" });
    expect(toHour12(12)).toEqual({ hour12: 12, period: "pm" });
    expect(toHour12(18)).toEqual({ hour12: 6, period: "pm" });
    expect(toHour24(12, "am")).toBe(0);
    expect(toHour24(12, "pm")).toBe(12);
    expect(toHour24(6, "pm")).toBe(18);
  });

  it("parses and formats datetime-local values", () => {
    expect(parseIsoDateTime("2026-11-01T18:30")).toEqual({
      date: "2026-11-01",
      hours: 18,
      minutes: 30,
    });
    expect(toIsoDateTime("2026-11-01", 18, 5)).toBe("2026-11-01T18:05");
    expect(formatTimePickerLabel(18, 5)).toBe("6:05 PM");
    expect(toIsoTime(18, 5)).toBe("18:05");
    expect(parseIsoTime("18:05")).toEqual({ hours: 18, minutes: 5 });
    expect(parseIsoTime("24:00")).toBeNull();
    expect(formatDateTimePickerLabel("2026-11-01T18:30")).toBe(
      "Nov 1, 2026, 6:30 PM",
    );
    expect(parseIsoDateTime("bad")).toBeNull();
    expect(addMinutesToDateTime("2026-11-01T18:00", 1)).toBe(
      "2026-11-01T18:01",
    );
    expect(addMinutesToDateTime("2026-11-01T18:00", -1)).toBe(
      "2026-11-01T17:59",
    );
  });

  it("keeps off-grid minutes from Set to now in the list", () => {
    expect(minuteChoices()).toContain(0);
    expect(minuteChoices()).toContain(55);
    expect(minuteChoices(18)).toContain(18);
  });

  it("disables times outside min/max", () => {
    expect(isTimeInRange(18, 0, "18:30")).toBe(false);
    expect(isTimeInRange(18, 30, "18:30")).toBe(true);
    expect(firstTimeInRange(18, "18:30")).toBe(30);
    expect(firstTimeInRange(17, "18:30")).toBeNull();
  });

  it("wraps infinite wheel scroll in the middle copy", () => {
    const cycle = 12 * 32;
    expect(wrapLoopScrollTop(cycle + 40, cycle)).toBe(cycle + 40);
    expect(wrapLoopScrollTop(40, cycle)).toBe(cycle + 40);
    expect(wrapLoopScrollTop(cycle * 2 + 40, cycle)).toBe(cycle + 40);
    expect(loopSelectedTopOffset(0, 12, 32)).toBe(12 * 32);
    expect(loopSelectedTopOffset(5, 12, 32)).toBe((12 + 5) * 32);
  });

  it("merges date and time into datetime-local values", () => {
    expect(mergeIsoDateAndTime("", "18:30", { hours: 9, minutes: 0 })).toBe("");
    expect(
      mergeIsoDateAndTime("2026-11-01", "18:30", { hours: 9, minutes: 0 }),
    ).toBe("2026-11-01T18:30");
    expect(
      mergeIsoDateAndTime("2026-11-01", "", { hours: 9, minutes: 15 }),
    ).toBe("2026-11-01T09:15");
  });

  it("converts picker wall clock to an ISO instant that round-trips locally", () => {
    const iso = wallClockToIso("2026-11-01T18:30");
    expect(iso.endsWith("Z")).toBe(true);
    const parsed = new Date(iso);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(18);
    expect(parsed.getMinutes()).toBe(30);
    expect(wallClockToIso("bad")).toBe("bad");
  });

  it("clamps datetime values on the same day as the bound", () => {
    expect(
      clampIsoDateTime("2026-11-01T10:00", "2026-11-01T18:00"),
    ).toBe("2026-11-01T18:00");
    expect(
      clampIsoDateTime("2026-10-31T10:00", "2026-11-01T18:00"),
    ).toBeNull();
    expect(
      clampIsoDateTime("2026-11-02T10:00", "2026-11-01T18:00"),
    ).toBe("2026-11-02T10:00");
    expect(clampIsoDateTime("2026-11-01T18:00", "2026-11-01T10:00")).toBe(
      "2026-11-01T18:00",
    );
  });
});
