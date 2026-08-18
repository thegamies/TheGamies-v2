import { describe, expect, it } from "vitest";
import { communityNavActiveFromPath } from "./community-nav";
import { editionEventTabActive } from "./edition-event-nav";

describe("communityNavActiveFromPath", () => {
  it("maps community section paths to masthead chips", () => {
    expect(communityNavActiveFromPath("/communities/eric", "eric")).toBe(
      "overview",
    );
    expect(
      communityNavActiveFromPath("/communities/eric/edition/2026", "eric"),
    ).toBe("edition");
    expect(communityNavActiveFromPath("/communities/eric/live/2026", "eric")).toBe(
      "live",
    );
    expect(communityNavActiveFromPath("/communities/eric/members", "eric")).toBe(
      "members",
    );
    expect(
      communityNavActiveFromPath("/communities/eric/settings", "eric"),
    ).toBe("settings");
    expect(
      communityNavActiveFromPath("/communities/eric/create/event", "eric"),
    ).toBe("settings");
  });
});

describe("editionEventTabActive", () => {
  it("maps results views onto the pre-publish event strip", () => {
    expect(editionEventTabActive("settings")).toBe("settings");
    expect(editionEventTabActive("hosts")).toBe("settings");
    expect(editionEventTabActive("voters")).toBe("voters");
    expect(editionEventTabActive("show")).toBe("show");
    expect(editionEventTabActive("overview")).toBe("show");
    expect(editionEventTabActive("ballot")).toBe("ballot");
    expect(editionEventTabActive("reveal")).toBe("ballot");
  });
});
