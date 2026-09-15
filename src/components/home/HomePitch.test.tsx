/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HomeCommunitiesIntro,
  HomeGotyIntro,
  HomeWhatIs,
} from "./HomePitch";

describe("Home guest chapters", () => {
  it("explains what the site is without a pitch", () => {
    render(<HomeWhatIs />);
    expect(
      screen.getByRole("heading", { name: "What is The Gamies?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/place to rank Game of the Year/i),
    ).toBeTruthy();
    expect(
      screen.queryByText(/Titles and covers come from IGDB/i),
    ).toBeNull();
  });

  it("combines list and standings under Game of the Year with plate CTAs", () => {
    render(<HomeGotyIntro />);
    expect(
      screen.getByRole("heading", { name: "Create a list" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "View results" }),
    ).toBeTruthy();
    expect(screen.getByText(/Your Top 10 earn points/i)).toBeTruthy();
    expect(screen.getByText(/pick your winners for each award/i)).toBeTruthy();
    expect(screen.getByText(/shape the live Game of the Year rankings/i)).toBeTruthy();
    expect(
      screen.getByText(/Category winners appear alongside/i),
    ).toBeTruthy();
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
      screen.getByRole("img", {
        name: "A Game of the Year list in Ranked grid view",
      }),
    ).toHaveAttribute("src", "/home/list-ranked.jpg");
    expect(
      screen.getByRole("img", {
        name: "Game of the Year standings with ranked covers",
      }),
    ).toHaveAttribute("src", "/home/standings-goty.jpg");
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
    render(<HomeCommunitiesIntro />);
    expect(
      screen.getByRole("heading", { name: "Run a community" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Create a community for your friends/i),
    ).toBeTruthy();
    expect(screen.getByText(/Keep rankings live throughout the year/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Communities" })).toHaveAttribute(
      "href",
      "/communities",
    );
    expect(
      screen.getByRole("img", {
        name: "A community overview with events and Pick’em",
      }),
    ).toHaveAttribute("src", "/home/community-overview.jpg");
    const row = document.querySelector(
      "[aria-labelledby='home-communities'] .home-chapter-rows > div",
    );
    expect(row?.firstElementChild?.className).toContain("md:order-2");
    expect(
      document.querySelector("[aria-labelledby='home-communities']")?.className,
    ).not.toContain("border-b");
  });
});
