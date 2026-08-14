import { describe, expect, it } from "vitest";
import { buildPrimarySiteNavLinks, showDesignSystemNav } from "./site-nav";

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
  it("includes the core routes and admin", () => {
    expect(buildPrimarySiteNavLinks({ includeDesignSystem: false })).toEqual([
      { href: "/games", label: "Games" },
      { href: "/game-of-the-year", label: "Standings" },
      { href: "/communities", label: "Communities" },
      { href: "/create", label: "Create" },
      { href: "/admin", label: "Admin" },
    ]);
  });

  it("inserts design system before admin when enabled", () => {
    const links = buildPrimarySiteNavLinks({ includeDesignSystem: true });
    expect(links.map((link) => link.href)).toEqual([
      "/games",
      "/game-of-the-year",
      "/communities",
      "/create",
      "/design-system",
      "/admin",
    ]);
  });
});
