import { describe, expect, it } from "vitest";
import {
  defaultLandingStandingsYears,
  parseLandingYearsInput,
  resolveLandingStandingsYears,
} from "./landing-years";

describe("defaultLandingStandingsYears", () => {
  it("returns current and previous UTC years", () => {
    expect(defaultLandingStandingsYears(new Date("2026-08-15T12:00:00Z"))).toEqual([
      2026, 2025,
    ]);
  });
});

describe("resolveLandingStandingsYears", () => {
  it("falls back when override is empty", () => {
    expect(resolveLandingStandingsYears(null, new Date("2026-01-01Z"))).toEqual([
      2026, 2025,
    ]);
    expect(resolveLandingStandingsYears([], new Date("2026-01-01Z"))).toEqual([
      2026, 2025,
    ]);
  });

  it("dedupes and sorts newest first", () => {
    expect(resolveLandingStandingsYears([2024, 2026, 2024, 2025])).toEqual([
      2026, 2025, 2024,
    ]);
  });

  it("ignores out-of-range values and falls back if none remain", () => {
    expect(resolveLandingStandingsYears([12, 9999], new Date("2026-01-01Z"))).toEqual([
      2026, 2025,
    ]);
  });
});

describe("parseLandingYearsInput", () => {
  it("returns null for blank input", () => {
    expect(parseLandingYearsInput("")).toBeNull();
    expect(parseLandingYearsInput("  ")).toBeNull();
  });

  it("parses commas and spaces", () => {
    expect(parseLandingYearsInput("2024, 2026 2025")).toEqual([
      2026, 2025, 2024,
    ]);
  });

  it("rejects non-numeric tokens", () => {
    expect(() => parseLandingYearsInput("2026, nope")).toThrow(/numbers/);
  });
});
