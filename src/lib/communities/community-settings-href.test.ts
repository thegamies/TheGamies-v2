import { describe, expect, it } from "vitest";
import {
  communitySettingsHref,
  communityCreateEventHref,
  parseCommunitySettingsTab,
} from "./community-settings-href";

describe("communitySettingsHref", () => {
  it("omits the query for Live Rankings", () => {
    expect(communitySettingsHref("test")).toBe("/communities/test/settings");
    expect(communitySettingsHref("test", { tab: "live" })).toBe(
      "/communities/test/settings",
    );
  });

  it("sets tab for Events", () => {
    expect(communitySettingsHref("test", { tab: "events" })).toBe(
      "/communities/test/settings?tab=events",
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

describe("communityCreateEventHref", () => {
  it("points at the host create page", () => {
    expect(communityCreateEventHref("test")).toBe(
      "/communities/test/create/event",
    );
    expect(communityCreateEventHref("the gamies")).toBe(
      "/communities/the%20gamies/create/event",
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
