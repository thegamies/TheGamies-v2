/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditionResultsLayoutProvider } from "./EditionResultsLayout";
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
    expect(screen.queryByRole("group", { name: "Results board" })).toBeNull();
  });

  it("puts Community, Hosts, and layout segments below the view tabs on Results", () => {
    render(
      <EditionResultsLayoutProvider>
        <EditionResultsViewNav
          slug="eric"
          year={2026}
          mode="community"
          view="overview"
          hasYourBallot={false}
          canManage={false}
        />
      </EditionResultsLayoutProvider>,
    );

    const filters = screen.getByRole("navigation", {
      name: "Results board filters",
    });
    expect(filters).toBeTruthy();
    const ranked = screen.getByRole("button", { name: "Ranked" });
    const community = screen.getByRole("link", { name: "Community" });
    expect(
      Boolean(
        ranked.compareDocumentPosition(community) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(community.getAttribute("href")).toBe(
      "/communities/eric/edition/2026?view=results",
    );
    expect(screen.getByRole("link", { name: "Hosts" }).getAttribute("href")).toBe(
      "/communities/eric/edition/2026?mode=voices&view=results",
    );

    fireEvent.click(screen.getByRole("button", { name: "Comparison" }));
    expect(screen.queryByRole("group", { name: "Results board" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Community" })).toBeNull();
    expect(screen.getByRole("button", { name: "Comparison" })).toBeTruthy();
  });
});
