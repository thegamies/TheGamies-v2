import { describe, expect, it } from "vitest";
import {
  buildAccountMenuGroups,
  buildPrimarySiteNavLinks,
  buildUtilitySiteNavLinks,
  showDesignSystemNav,
  siteCreateLink,
} from "./site-nav";

describe("showDesignSystemNav", () => {
  it("hides on Vercel production", () => {
    expect(
      showDesignSystemNav({
        vercelEnv: "production",
        nodeEnv: "production",
        showDesignSystem: "1",
      }),
    ).toBe(false);
  });

  it("shows in local development", () => {
    expect(
      showDesignSystemNav({
        nodeEnv: "development",
      }),
    ).toBe(true);
  });

  it("shows on Vercel preview", () => {
    expect(
      showDesignSystemNav({
        vercelEnv: "preview",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("requires opt-in outside preview and development", () => {
    expect(
      showDesignSystemNav({
        vercelEnv: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
    expect(
      showDesignSystemNav({
        vercelEnv: undefined,
        nodeEnv: "production",
        showDesignSystem: "1",
      }),
    ).toBe(true);
  });
});

describe("buildPrimarySiteNavLinks", () => {
  it("is Games, GOTY, and Communities only", () => {
    expect(buildPrimarySiteNavLinks()).toEqual([
      { href: "/games", label: "Games" },
      { href: "/game-of-the-year", label: "GOTY" },
      { href: "/communities", label: "Communities" },
    ]);
  });

  it("inserts Video Game Awards Pick’em when promoted", () => {
    expect(buildPrimarySiteNavLinks({ tgaHref: "/the-game-awards/2026" })).toEqual([
      { href: "/games", label: "Games" },
      { href: "/game-of-the-year", label: "GOTY" },
      { href: "/the-game-awards/2026", label: "Video Game Awards Pick’em" },
      { href: "/communities", label: "Communities" },
    ]);
  });
});

describe("siteCreateLink", () => {
  it("points at create with the plus label", () => {
    expect(siteCreateLink()).toEqual({ href: "/create", label: "+ Create" });
  });
});

describe("buildUtilitySiteNavLinks", () => {
  it("always includes Admin", () => {
    expect(buildUtilitySiteNavLinks({ includeDesignSystem: false })).toEqual([
      { href: "/admin", label: "Admin" },
    ]);
  });

  it("appends Design system when enabled", () => {
    expect(
      buildUtilitySiteNavLinks({ includeDesignSystem: true }).map(
        (link) => link.href,
      ),
    ).toEqual(["/admin", "/design-system"]);
  });
});

describe("buildAccountMenuGroups", () => {
  it("links a username to profile tabs", () => {
    const groups = buildAccountMenuGroups({
      username: "ecdm98",
      includeDesignSystem: true,
    });
    expect(groups.flatMap((group) => group.items)).toEqual([
      { href: "/u/ecdm98", label: "View Profile" },
      { href: "/u/ecdm98", label: "My Lists" },
      { href: "/u/ecdm98?tab=communities", label: "My Communities" },
      { href: "/account", label: "Settings" },
      { href: "/admin", label: "Admin" },
      { href: "/design-system", label: "Design system" },
    ]);
  });

  it("sends users without a username to account settings", () => {
    const groups = buildAccountMenuGroups({
      username: null,
      includeDesignSystem: false,
    });
    expect(groups.flatMap((group) => group.items)).toEqual([
      { href: "/account", label: "View Profile" },
      { href: "/account", label: "Settings" },
      { href: "/admin", label: "Admin" },
    ]);
  });
});
