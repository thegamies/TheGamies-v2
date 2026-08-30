import { describe, expect, it } from "vitest";
import { YEAR_PICKER_MIN } from "@/lib/ui/calendar-year";
import { ALL_YEARS_VALUE, browseYearOptions } from "./browse-filters";

describe("browseYearOptions", () => {
  it("lists current year plus two, down to the year picker minimum", () => {
    const years = browseYearOptions(2026);
    expect(years[0]).toBe(2028);
    expect(years.at(-1)).toBe(YEAR_PICKER_MIN);
    expect(years).toContain(2026);
    expect(years.length).toBe(2028 - YEAR_PICKER_MIN + 1);
  });

  it("keeps all-years as an empty filter value", () => {
    expect(ALL_YEARS_VALUE).toBe("");
  });
});
