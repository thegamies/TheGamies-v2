/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditionResultsViewNav } from "./EditionResultsView";

afterEach(() => {
  cleanup();
});

describe("EditionResultsViewNav", () => {
  it("keeps Reveal through Settings when hosts open event settings", () => {
    render(
      <EditionResultsViewNav
        slug="kindafunny"
        year={2026}
        mode="community"
        view="settings"
        hasYourBallot
        canManage
      />,
    );

    expect(screen.getByRole("link", { name: "Reveal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Results" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Full standings" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Categories" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voters" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Your ballot" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Settings" }).getAttribute("href"),
    ).toBe("/communities/kindafunny/edition/2026?view=settings");
    expect(screen.queryByRole("link", { name: "Ballot" })).toBeNull();
  });
});
