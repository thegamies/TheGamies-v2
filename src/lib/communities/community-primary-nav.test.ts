import { describe, expect, it } from "vitest";
import {
  communityLiveNavYear,
  communityPrimaryHref,
} from "./community-primary-nav";

describe("communityPrimaryHref", () => {
  it("points section chips at year URLs so Next does not redirect", () => {
    expect(communityPrimaryHref("eric", "overview")).toBe("/communities/eric");
    expect(
      communityPrimaryHref("eric", "live", { live: 2026 }),
    ).toBe("/communities/eric/live/2026");
    expect(
      communityPrimaryHref("eric", "edition", { edition: 2026 }),
    ).toBe("/communities/eric/edition/2026");
    expect(
      communityPrimaryHref("eric", "tga", { tga: 2025 }),
    ).toBe("/communities/eric/the-game-awards/2025");
  });
});

describe("communityLiveNavYear", () => {
  it("uses the UTC calendar year", () => {
    expect(communityLiveNavYear(new Date("2026-08-24T05:00:00.000Z"))).toBe(
      2026,
    );
  });
});
