import { describe, expect, it } from "vitest";
import {
  communitySettingsHref,
  parseCommunitySettingsTab,
  pickSettingsEditionYear,
} from "./community-settings-href";

describe("communitySettingsHref", () => {
  it("omits the query for Live Rankings", () => {
    expect(communitySettingsHref("test")).toBe("/communities/test/settings");
    expect(communitySettingsHref("test", { tab: "live" })).toBe(
      "/communities/test/settings",
    );
  });

  it("sets tab and year for Events", () => {
    expect(communitySettingsHref("test", { tab: "events" })).toBe(
      "/communities/test/settings?tab=events",
    );
    expect(communitySettingsHref("test", { tab: "events", year: 2026 })).toBe(
      "/communities/test/settings?tab=events&year=2026",
    );
  });

  it("sets tab for Community", () => {
    expect(communitySettingsHref("test", { tab: "community" })).toBe(
      "/communities/test/settings?tab=community",
    );
  });

  it("encodes the slug", () => {
    expect(communitySettingsHref("the gamies")).toBe(
      "/communities/the%20gamies/settings",
    );
  });
});

describe("parseCommunitySettingsTab", () => {
  it("defaults to live", () => {
    expect(parseCommunitySettingsTab(undefined)).toBe("live");
    expect(parseCommunitySettingsTab("live")).toBe("live");
    expect(parseCommunitySettingsTab("nope")).toBe("live");
    expect(parseCommunitySettingsTab("events")).toBe("events");
    expect(parseCommunitySettingsTab("community")).toBe("community");
  });
});

describe("pickSettingsEditionYear", () => {
  it("returns null when there are no years", () => {
    expect(pickSettingsEditionYear([], 2026, 2025)).toBeNull();
  });

  it("prefers a requested year that exists", () => {
    expect(pickSettingsEditionYear([2026, 2025], 2025, 2026)).toBe(2025);
  });

  it("falls back to featured, then latest", () => {
    expect(pickSettingsEditionYear([2026, 2024], 2025, 2024)).toBe(2024);
    expect(pickSettingsEditionYear([2026, 2024], 2025, 2023)).toBe(2026);
  });
});
