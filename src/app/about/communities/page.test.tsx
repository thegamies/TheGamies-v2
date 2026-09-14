/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutCommunitiesPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/communities",
}));

describe("AboutCommunitiesPage", () => {
  it("separates live rankings from Events", () => {
    render(<AboutCommunitiesPage />);
    expect(
      screen.getByRole("heading", { name: "Communities" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Events" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Find or start a community" }).getAttribute("href"),
    ).toBe("/communities");
  });
});
