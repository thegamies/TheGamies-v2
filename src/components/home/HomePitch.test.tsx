/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HomeCommunitiesIntro,
  HomeGotyIntro,
  HomeWhatIs,
} from "./HomePitch";

const covers = [
  { gameId: "1", title: "One", coverUrl: "https://cdn.example/1.jpg" },
  { gameId: "2", title: "Two", coverUrl: "https://cdn.example/2.jpg" },
  { gameId: "3", title: "Three", coverUrl: "https://cdn.example/3.jpg" },
  { gameId: "4", title: "Four", coverUrl: "https://cdn.example/4.jpg" },
];

describe("Home guest chapters", () => {
  it("explains what the site is without a pitch", () => {
    render(<HomeWhatIs />);
    expect(
      screen.getByRole("heading", { name: "What is The Gamies?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/place to rank Game of the Year/i),
    ).toBeTruthy();
    expect(screen.getByText(/Titles and covers come from IGDB/i)).toBeTruthy();
  });

  it("combines list and standings under Game of the Year with plate CTAs", () => {
    render(
      <HomeGotyIntro
        listCovers={covers}
        standingsCovers={covers.map((game, i) => ({ ...game, place: i + 1 }))}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Create a list" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "View results" }),
    ).toBeTruthy();
    expect(screen.getByText(/top 10 score/i)).toBeTruthy();
    expect(screen.getByText(/one game per award/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create a list" })).toHaveAttribute(
      "href",
      "/create/goty",
    );
    expect(screen.getByRole("link", { name: "Make picks" })).toHaveAttribute(
      "href",
      "/create/goty?view=categories",
    );
    expect(screen.getByRole("link", { name: "All years" })).toHaveAttribute(
      "href",
      "/game-of-the-year",
    );
    expect(
      screen.getByRole("link", { name: "Game of the Year" }),
    ).toHaveAttribute("href", "/game-of-the-year");
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute(
      "href",
      "/game-of-the-year",
    );
    expect(
      screen.getByRole("link", { name: "How rankings work" }),
    ).toHaveAttribute("href", "/rankings");
    expect(
      document.querySelectorAll('a[href^="/games/"]').length,
    ).toBe(0);
    const rows = document.querySelectorAll(
      "[aria-labelledby='home-goty'] .home-chapter-rows > div",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.firstElementChild?.className).toContain("md:order-2");
    expect(rows[1]?.firstElementChild?.className).not.toContain("md:order-2");
    expect(
      document.querySelector("[aria-labelledby='home-goty']")?.className,
    ).not.toContain("border-b");
  });

  it("gives communities one plate and a CTA", () => {
    render(<HomeCommunitiesIntro covers={covers} />);
    expect(screen.getByText(/live rankings from members/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Communities" })).toHaveAttribute(
      "href",
      "/communities",
    );
    const row = document.querySelector(
      "[aria-labelledby='home-communities'] .home-chapter-rows > div",
    );
    expect(row?.firstElementChild?.className).toContain("md:order-2");
    expect(
      document.querySelector("[aria-labelledby='home-communities']")?.className,
    ).not.toContain("border-b");
  });
});
