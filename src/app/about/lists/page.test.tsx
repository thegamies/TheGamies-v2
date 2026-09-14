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
    expect(screen.getByText(/top 10 score/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Create a Game of the Year list" }).getAttribute("href"),
    ).toBe("/create/goty");
    expect(
      screen.getByRole("link", { name: "Create a custom list" }).getAttribute("href"),
    ).toBe("/create/custom");
  });
});
