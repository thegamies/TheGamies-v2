/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomeCoverStrip } from "./HomeCoverStrip";

afterEach(() => {
  cleanup();
});

describe("HomeCoverStrip", () => {
  it("links covers to game pages and the heading to the full board", () => {
    render(
      <HomeCoverStrip
        title="Trending"
        moreHref="/games?sort=trending"
        games={[
          {
            gameId: "1",
            slug: "hades-ii",
            title: "Hades II",
            coverUrl: "https://cdn.example/hades.jpg",
          },
        ]}
        empty="Nothing yet."
        label="Trending games"
      />,
    );
    expect(screen.getByRole("link", { name: "Trending" })).toHaveAttribute(
      "href",
      "/games?sort=trending",
    );
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/games?sort=trending",
    );
    expect(screen.getByRole("link", { name: /Hades II/i })).toHaveAttribute(
      "href",
      "/games/hades-ii",
    );
  });

  it("shows an editorial empty when the board is not ready", () => {
    render(
      <HomeCoverStrip
        title="Upcoming"
        moreHref="/games?releaseStatus=upcoming"
        games={[]}
        empty="No upcoming titles in the catalog yet."
        label="Upcoming games"
      />,
    );
    expect(
      screen.getByText("No upcoming titles in the catalog yet."),
    ).toBeTruthy();
  });
});
