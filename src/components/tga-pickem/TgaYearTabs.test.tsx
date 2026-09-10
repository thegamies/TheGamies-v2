/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TgaYearTabs } from "./TgaYearTabs";

afterEach(() => {
  cleanup();
});

describe("TgaYearTabs", () => {
  it("hides Your ballot for guest standings", () => {
    render(
      <TgaYearTabs
        path="/communities/eric/the-game-awards/2025"
        view="standings"
        showYourBallot={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "Your ballot" })).toBeNull();
    expect(screen.getByRole("link", { name: "Standings" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("shows Your ballot by default", () => {
    render(
      <TgaYearTabs path="/the-game-awards/2025" view="ballot" />,
    );

    expect(screen.getByRole("link", { name: "Your ballot" })).toBeTruthy();
  });
});
