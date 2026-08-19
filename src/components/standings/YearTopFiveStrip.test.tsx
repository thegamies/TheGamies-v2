/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STANDING_FILL_SCOPE_CLASS } from "@/lib/standings/standing-fill";
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

  it("keeps the editorial 5-up card width on the top-five and category strips", () => {
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
      expect(list.className).toContain(
        "[grid-auto-columns:var(--standing-fill-card)]",
      );
    }
  });

  it("applies a decimal covers-in-view count as a CSS variable", () => {
    const { container } = render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        minVisible={2.5}
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
      />,
    );

    const article = container.querySelector("article");
    expect(article?.classList.contains(STANDING_FILL_SCOPE_CLASS)).toBe(true);
    expect(article?.style.getPropertyValue("--standing-fill-min-visible")).toBe(
      "2.5",
    );
  });
});
