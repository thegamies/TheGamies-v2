import { describe, expect, it } from "vitest";
import {
  canUseSiteTrendingWorkersCache,
  siteTrendingCacheRequest,
} from "./site-trending-cache";

describe("canUseSiteTrendingWorkersCache", () => {
  it("allows the public site board", () => {
    expect(canUseSiteTrendingWorkersCache({})).toBe(true);
  });

  it("skips per-viewer boards and injected test clocks", () => {
    expect(
      canUseSiteTrendingWorkersCache({ followerProfileId: "p1" }),
    ).toBe(false);
    expect(canUseSiteTrendingWorkersCache({ communityId: "c1" })).toBe(false);
    expect(canUseSiteTrendingWorkersCache({ db: {} })).toBe(false);
    expect(canUseSiteTrendingWorkersCache({ now: new Date() })).toBe(false);
  });
});

describe("siteTrendingCacheRequest", () => {
  it("keys window, page, floor, and people together", () => {
    const url = siteTrendingCacheRequest({
      windowHours: 168,
      page: 1,
      minPeople: 5,
      applySiteFloor: true,
    }).url;
    expect(url).toContain("hours=168");
    expect(url).toContain("page=1");
    expect(url).toContain("min=5");
    expect(url).toContain("floor=1");
  });
});
