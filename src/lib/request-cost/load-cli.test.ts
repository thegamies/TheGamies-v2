import { describe, expect, it } from "vitest";
import {
  parseDurationMs,
  parseLoadArgs,
  refuseLoadAppUrl,
} from "./load-cli";

describe("parseLoadArgs", () => {
  it("defaults to a 10 minute general run", () => {
    expect(parseLoadArgs([])).toEqual({
      scenarios: ["general"],
      durationMs: 10 * 60 * 1000,
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
});

describe("parseDurationMs", () => {
  it("accepts 10m and refuses over an hour", () => {
    expect(parseDurationMs("10m")).toBe(600_000);
    expect(parseDurationMs("30s")).toBe(30_000);
    expect(parseDurationMs("2h")).toHaveProperty("error");
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
