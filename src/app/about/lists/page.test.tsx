/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutListsPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/lists",
}));

describe("AboutListsPage", () => {
  it("explains GOTY scoring and custom lists", () => {
    render(<AboutListsPage />);
    expect(screen.getByRole("heading", { name: "Lists" })).toBeTruthy();
    expect(
      screen.getByText(/two kinds of lists: yearly Game of the Year/i),
    ).toBeTruthy();
    expect(screen.getByText(/Your Top 10 determine the points/i)).toBeTruthy();
    expect(
      screen.getByText(/Games ranked 11 through 100 still appear/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/not tied to a specific year and do not contribute/i),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Create a Game of the Year list" }).getAttribute("href"),
    ).toBe("/create/goty");
    expect(
      screen.getByRole("link", { name: "Create a custom list" }).getAttribute("href"),
    ).toBe("/create/custom");
  });
});
