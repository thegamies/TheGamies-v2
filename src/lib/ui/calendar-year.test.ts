import { describe, expect, it } from "vitest";
import {
  addYearGrid,
  isYearInRange,
  nextAvailableYear,
  yearGridStart,
  yearGridYears,
} from "./calendar-year";

describe("calendar-year", () => {
  it("pages a 12-year grid", () => {
    expect(yearGridStart(2026)).toBe(2016);
    expect(yearGridYears(2016)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ]);
    expect(addYearGrid(2016, 1)).toBe(2028);
    expect(addYearGrid(2016, -1)).toBe(2004);
  });

  it("checks min/max and skips taken years", () => {
    expect(isYearInRange(2026)).toBe(true);
    expect(isYearInRange(1969)).toBe(false);
    expect(isYearInRange(2101)).toBe(false);
    expect(nextAvailableYear(2026, [2026, 2027])).toBe(2028);
    expect(nextAvailableYear(2100, [2100])).toBe(2099);
  });
});
