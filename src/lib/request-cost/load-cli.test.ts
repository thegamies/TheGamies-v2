import { describe, expect, it } from "vitest";
import {
  loadVuStartOffsetMs,
  parseDurationMs,
  parseLoadArgs,
  parseRampMs,
  refuseLoadAppUrl,
} from "./load-cli";

describe("parseLoadArgs", () => {
  it("defaults to a 10 minute general run with a 30s VU ramp", () => {
    expect(parseLoadArgs([])).toEqual({
      scenarios: ["general"],
      durationMs: 10 * 60 * 1000,
      rampMs: 30_000,
      vusRead: 20,
      writers: 0,
    });
  });

  it("parses --all and writer cap", () => {
    const parsed = parseLoadArgs([
      "--all",
      "--duration",
      "10m",
      "--vus-read",
      "20",
      "--writers",
      "50",
    ]);
    expect(parsed).toMatchObject({
      durationMs: 600_000,
      rampMs: 30_000,
      vusRead: 20,
      writers: 50,
    });
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.scenarios).toHaveLength(5);
  });

  it("refuses unknown scenarios and over-cap writers", () => {
    expect(parseLoadArgs(["--scenario", "prod"])).toHaveProperty("error");
    expect(parseLoadArgs(["--writers", "101"])).toHaveProperty("error");
  });

  it("parses --ramp 0 for an all-at-once start", () => {
    expect(parseLoadArgs(["--ramp", "0"])).toMatchObject({ rampMs: 0 });
    expect(parseLoadArgs(["--ramp", "15s"])).toMatchObject({ rampMs: 15_000 });
  });
});

describe("loadVuStartOffsetMs", () => {
  it("spreads VUs across the ramp the way k6 ramping-vus does", () => {
    expect(loadVuStartOffsetMs(0, 50, 30_000)).toBe(0);
    expect(loadVuStartOffsetMs(25, 50, 30_000)).toBe(15_000);
    expect(loadVuStartOffsetMs(49, 50, 30_000)).toBe(29_400);
    expect(loadVuStartOffsetMs(10, 50, 0)).toBe(0);
  });
});

describe("parseDurationMs", () => {
  it("accepts 10m and refuses over an hour", () => {
    expect(parseDurationMs("10m")).toBe(600_000);
    expect(parseDurationMs("30s")).toBe(30_000);
    expect(parseDurationMs("2h")).toHaveProperty("error");
  });
});

describe("parseRampMs", () => {
  it("allows zero and the same units as duration", () => {
    expect(parseRampMs("0")).toBe(0);
    expect(parseRampMs("0s")).toBe(0);
    expect(parseRampMs("30s")).toBe(30_000);
  });
});

describe("refuseLoadAppUrl", () => {
  it("refuses production hosts", () => {
    expect(refuseLoadAppUrl("https://thegamies.gg")).toMatch(/production/);
    expect(
      refuseLoadAppUrl("https://thegamies-v2.ecdm981.workers.dev"),
    ).toMatch(/production/);
    expect(
      refuseLoadAppUrl("https://thegamies-v2-develop.ecdm981.workers.dev"),
    ).toBeNull();
  });
});
