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
  it("links the year heading to full rankings", () => {
    render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        rows={[]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "2026 Game of the Year" }).getAttribute("href"),
    ).toBe("/game-of-the-year/2026");
    expect(
      screen.getByRole("link", { name: "2026 Game of the Year" }).className,
    ).toContain("hover:text-accent");
    const fullStandings = screen.getByRole("link", { name: "Full Standings" });
    expect(fullStandings.getAttribute("href")).toBe("/game-of-the-year/2026");
    expect(fullStandings.className).toContain("border");
    expect(screen.queryByRole("link", { name: "Full rankings" })).toBeNull();
    expect(screen.queryByText("(see all)")).toBeNull();
    const create = screen.getByRole("link", { name: "Create list" });
    expect(create.getAttribute("href")).toBe("/create/goty?year=2026");
    expect(create.className).toContain("border");
    expect(screen.getByRole("link", { name: "Top Categories" })).toBeTruthy();
    const seeAll = screen.getByRole("link", { name: "See All" });
    expect(seeAll.getAttribute("href")).toBe(
      "/game-of-the-year/2026?view=categories",
    );
    expect(seeAll.className).toContain("border");
    expect(screen.getByText("Not enough votes yet.")).toBeTruthy();
    const addCategories = screen.getByRole("link", {
      name: "Add categories to your list",
    });
    expect(addCategories.getAttribute("href")).toBe(
      "/create/goty?year=2026&view=categories",
    );
    expect(addCategories.className).toContain("border");
    expect(addCategories.parentElement?.className).toContain("items-center");
    expect(addCategories.parentElement?.className).toContain("min-h-28");
    expect(
      screen.getByRole("link", { name: "Make picks" }).getAttribute("href"),
    ).toBe("/create/goty?year=2026&view=categories");
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

    expect(
      screen.getByRole("link", { name: "Top Categories" }).getAttribute("href"),
    ).toBe("/game-of-the-year/2026?view=categories");
    expect(
      screen.getByRole("link", { name: "Top Categories" }).className,
    ).toContain("hover:text-accent");
    const seeAll = screen.getByRole("link", { name: "See All" });
    expect(seeAll.getAttribute("href")).toBe(
      "/game-of-the-year/2026?view=categories",
    );
    expect(seeAll.className).toContain("border");
    expect(screen.queryByRole("link", { name: "All categories" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Make picks" }).getAttribute("href"),
    ).toBe("/create/goty?year=2026&view=categories");
    expect(
      screen.getByRole("link", { name: "Make picks" }).className,
    ).toContain("border");
    expect(screen.queryByText(/Not enough votes yet/)).toBeNull();
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

  it("uses My list and My picks when the year is owned", () => {
    render(
      <YearTopFiveStrip
        year={2026}
        yearHref="/game-of-the-year/2026"
        rows={[]}
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
        creatorCta={{
          listLabel: "My list",
          listHref: "/create/goty?id=abc123",
          categoriesLabel: "My picks",
          categoriesHref: "/create/goty?id=abc123&view=categories",
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "My list" }).className,
    ).toContain("border");
    expect(
      screen.getByRole("link", { name: "My list" }).getAttribute("href"),
    ).toBe("/create/goty?id=abc123");
    expect(
      screen.getByRole("link", { name: "My picks" }).getAttribute("href"),
    ).toBe("/create/goty?id=abc123&view=categories");
    expect(screen.queryByRole("link", { name: "Create list" })).toBeNull();
  });
});
