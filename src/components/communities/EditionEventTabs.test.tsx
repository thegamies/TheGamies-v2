/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditionEventTabs } from "./EditionEventTabs";

afterEach(() => {
  cleanup();
});

describe("EditionEventTabs", () => {
  it("shows Ballot and Voters to members while voting is open", () => {
    render(
      <EditionEventTabs
        slug="eric"
        year={2026}
        canManage={false}
        includeBallot
        includeVoters
        active="ballot"
      />,
    );
    expect(screen.getByRole("link", { name: "Ballot" }).getAttribute("href")).toBe(
      "/communities/eric/edition/2026",
    );
    expect(screen.getByRole("link", { name: "Voters" }).getAttribute("href")).toBe(
      "/communities/eric/edition/2026?view=voters",
    );
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("hides Ballot while scheduled and still offers Settings to hosts", () => {
    render(
      <EditionEventTabs
        slug="eric"
        year={2026}
        canManage
        includeBallot={false}
        includeVoters={false}
        active="settings"
      />,
    );
    expect(screen.queryByRole("link", { name: "Ballot" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Voters" })).toBeNull();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
  });
});
