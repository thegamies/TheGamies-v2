import { describe, expect, it } from "vitest";
import {
  SITE_ENDPOINTS,
  compareEndpointsForTest,
  endpointCoverage,
  endpointKey,
} from "./catalog";

describe("SITE_ENDPOINTS", () => {
  it("has unique method+path keys", () => {
    const keys = SITE_ENDPOINTS.map(endpointKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ranks home and game pages ahead of legal pages", () => {
    const home = SITE_ENDPOINTS.find((row) => row.path === "/")!;
    const terms = SITE_ENDPOINTS.find((row) => row.path === "/terms")!;
    expect(compareEndpointsForTest(home, terms)).toBeLessThan(0);
    expect(home.testPriority).toBe(4);
    expect(home.usage).toBe(5);
    expect(home.dbImpact).toBe(4);
  });

  it("keeps scale fields in 1–5", () => {
    for (const row of SITE_ENDPOINTS) {
      expect(row.usage).toBeGreaterThanOrEqual(1);
      expect(row.usage).toBeLessThanOrEqual(5);
      expect(row.dbImpact).toBeGreaterThanOrEqual(1);
      expect(row.dbImpact).toBeLessThanOrEqual(5);
      expect(row.testPriority).toBeGreaterThanOrEqual(1);
      expect(row.testPriority).toBeLessThanOrEqual(4);
      expect(row.cacheEase).toBeGreaterThanOrEqual(1);
      expect(row.cacheEase).toBeLessThanOrEqual(5);
      expect(row.cacheComplexity).toBeGreaterThanOrEqual(1);
      expect(row.cacheComplexity).toBeLessThanOrEqual(5);
      expect(row.cacheNotes.length).toBeGreaterThan(8);
    }
  });

  it("records load-mix coverage on home and not on legal pages", () => {
    const home = SITE_ENDPOINTS.find((row) => row.path === "/")!;
    const terms = SITE_ENDPOINTS.find((row) => row.path === "/terms")!;
    const createGoty = SITE_ENDPOINTS.find((row) => row.path === "/create/goty")!;
    expect(endpointCoverage(home).label).toBe("Load mix");
    expect(endpointCoverage(terms).label).toBe("Not yet");
    expect(createGoty.loadMix).toBe(true);
    expect(endpointCoverage(createGoty).label).toContain("Load mix");
    expect(SITE_ENDPOINTS.find((row) => row.path === "/l/:publicId")!.loadMix).toBe(
      true,
    );
    expect(
      SITE_ENDPOINTS.find((row) => row.path === "/u/:username/:listSlug")!.loadMix,
    ).toBe(true);
  });

  it("marks rankings easy to cache and home hard to keep fresh", () => {
    const rankings = SITE_ENDPOINTS.find((row) => row.path === "/rankings")!;
    const home = SITE_ENDPOINTS.find((row) => row.path === "/")!;
    expect(rankings.cacheEase).toBe(5);
    expect(rankings.cacheComplexity).toBe(1);
    expect(home.cacheComplexity).toBe(5);
  });
});
