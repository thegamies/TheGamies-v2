/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveStandingsView } from "./LiveStandingsView";
import type { StandingsPage } from "@/lib/live-aggregate/service";

const unpublished: StandingsPage = {
  year: 2026,
  listCount: 2,
  detailedStatsRevealed: false,
  standingsVersion: 0,
  scoresFresh: true,
  page: 1,
  pageSize: 50,
  gotyTotal: 0,
  totalPages: 1,
  goty: [],
  categories: [],
  categoryGroup: "all",
  view: "goty",
  categoryId: null,
  categoryGameTotal: 0,
  gotyPublic: false,
  categoriesPublic: false,
};

afterEach(() => {
  cleanup();
});

describe("LiveStandingsView", () => {
  it("uses editorial empty copy and hides list count below the publish floor", () => {
    render(<LiveStandingsView page={unpublished} yearOptions={[2026]} />);
    expect(
      screen.getByText("This year's board is still coming together."),
    ).toBeTruthy();
    expect(screen.queryByText(/2 lists/)).toBeNull();
  });

  it("links Create list into the GOTY creator", () => {
    render(<LiveStandingsView page={unpublished} yearOptions={[2026]} />);
    expect(
      screen.getByRole("link", { name: "Create list" }).getAttribute("href"),
    ).toBe("/create/goty?year=2026");
  });

  it("links Make picks on the categories board", () => {
    render(
      <LiveStandingsView
        page={{ ...unpublished, view: "categories" }}
        yearOptions={[2026]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Make picks" }).getAttribute("href"),
    ).toBe("/create/goty?year=2026&view=categories");
    expect(screen.queryByRole("link", { name: "Create list" })).toBeNull();
  });

  it("links My list when the year is owned", () => {
    render(
      <LiveStandingsView
        page={unpublished}
        yearOptions={[2026]}
        creatorCta={{
          listLabel: "My list",
          listHref: "/create/goty?id=abc123",
          categoriesLabel: "My picks",
          categoriesHref: "/create/goty?id=abc123&view=categories",
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "My list" }).getAttribute("href"),
    ).toBe("/create/goty?id=abc123");
  });

  it("keeps the info control and year on the first title line", () => {
    render(
      <LiveStandingsView page={unpublished} yearOptions={[2026, 2025]} />,
    );
    const title = screen.getByRole("heading", { name: "2026 Game of the Year" });
    expect(title.className).toContain("text-pretty");
    const info = screen.getByRole("button", { name: "About rankings" });
    const row = title.parentElement?.parentElement;
    expect(row?.className).toContain("items-start");
    expect(row?.className).not.toContain("flex-wrap");
    expect(title.parentElement?.className).toContain("items-start");
    expect(info.parentElement?.className).toContain("h-[1em]");
    const year = screen.getByRole("button", { name: "Standings year" });
    expect(year.className).toContain("items-center");
    expect(year.className).toContain("leading-none");
    expect(year.parentElement?.parentElement?.className).toContain("text-base");
    expect(
      year.parentElement?.parentElement?.parentElement?.className,
    ).toContain("h-[1em]");
    fireEvent.click(year);
    expect(screen.getByRole("link", { name: "All" }).getAttribute("href")).toBe(
      "/game-of-the-year",
    );
  });

  it("puts the creator link on the list-total row", () => {
    render(
      <LiveStandingsView
        page={{ ...unpublished, gotyPublic: true, listCount: 12 }}
        yearOptions={[2026]}
      />,
    );
    const totals = screen.getByText("12 lists");
    const create = screen.getByRole("link", { name: "Create list" });
    expect(totals.parentElement).toBe(create.parentElement);
    expect(create.className).toContain("text-accent");
  });
});
