/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YearTopFiveStrip } from "./YearTopFiveStrip";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

afterEach(() => {
  cleanup();
});

describe("YearTopFiveStrip", () => {
  it("links the year CTA to full rankings", () => {
    render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        rows={[]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Full rankings" }).getAttribute("href"),
    ).toBe("/game-of-the-year/2026");
    expect(screen.queryByRole("link", { name: "Standings" })).toBeNull();
  });

  it("links category names, game titles, and all-categories", () => {
    render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        rows={[
          {
            place: 1,
            gameId: "g1",
            slug: "hades-ii",
            title: "Hades II",
            coverUrl: null,
            score: 40,
          },
        ]}
        categoryWinners={[
          {
            categoryId: "best-debut",
            label: "Best Debut",
            games: [
              {
                gameId: "g2",
                slug: "clair-obscur",
                title: "Clair Obscur",
                coverUrl: null,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Top Categories")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "All categories" }).getAttribute("href"),
    ).toBe("/game-of-the-year/2026?view=categories");
    const category = screen.getByRole("link", { name: "Best Debut" });
    expect(category.getAttribute("href")).toBe(
      "/game-of-the-year/2026?view=category&category=best-debut",
    );
    expect(category.className).toContain("truncate");
    expect(
      screen.getByRole("link", { name: /Clair Obscur/ }).getAttribute("href"),
    ).toBe("/games/clair-obscur");
    expect(
      screen.getByRole("link", { name: /Hades II/ }).getAttribute("href"),
    ).toBe("/games/hades-ii");
  });

  it("sizes the top-five and category strips three-up on mobile", () => {
    const { container } = render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        rows={[
          {
            place: 1,
            gameId: "g1",
            slug: "hades-ii",
            title: "Hades II",
            coverUrl: null,
            score: 40,
          },
        ]}
        categoryWinners={[
          {
            categoryId: "best-debut",
            label: "Best Debut",
            games: [
              {
                gameId: "g2",
                slug: "clair-obscur",
                title: "Clair Obscur",
                coverUrl: null,
              },
            ],
          },
        ]}
      />,
    );

    const lists = [...container.querySelectorAll("ul")];
    expect(lists.length).toBe(2);
    for (const list of lists) {
      expect(list.className).toContain("(100cqi_-_1rem)/3");
      expect(list.className).toContain(
        "sm:[grid-auto-columns:calc((100cqi_-_4rem)/5)]",
      );
    }
  });
});
