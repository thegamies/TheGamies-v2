/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RankingsPage from "./page";

describe("RankingsPage", () => {
  it("explains scoring and separates editions from Pick’em", () => {
    render(<RankingsPage />);
    expect(
      screen.getByRole("heading", { name: "How rankings work" }),
    ).toBeTruthy();
    expect(screen.getByText(/10 points for 1st/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "2025 recap" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "year-by-year standings" }).getAttribute(
        "href",
      ),
    ).toBe("/game-of-the-year");
    expect(
      screen.getByRole("heading", { name: "Video Game Awards Pick’em" }),
    ).toBeTruthy();
  });
});
