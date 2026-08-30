/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommunityNav } from "./CommunityHeader";

afterEach(() => {
  cleanup();
});

describe("CommunityNav", () => {
  it("links Awards and Live to year paths", () => {
    render(
      <CommunityNav
        slug="eric"
        liveEnabled
        canManage={false}
        editionStatus="published"
        editionYear={2026}
        tgaEnabled
        tgaYear={2025}
        active="overview"
      />,
    );

    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe(
      "/communities/eric",
    );
    expect(
      screen.getByRole("link", { name: "Live Rankings" }).getAttribute("href"),
    ).toBe(`/communities/eric/live/${new Date().getUTCFullYear()}`);
    expect(screen.getByRole("link", { name: "Events" }).getAttribute("href")).toBe(
      "/communities/eric/edition/2026",
    );
    expect(
      screen.getByRole("link", { name: /Pick/ }).getAttribute("href"),
    ).toBe("/communities/eric/the-game-awards/2025");
  });
});
