/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPeoplePage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/people",
}));

describe("AboutPeoplePage", () => {
  it("explains follow versus communities", () => {
    render(<AboutPeoplePage />);
    expect(screen.getByRole("heading", { name: "People" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Following" }).getAttribute("href"),
    ).toBe("/following");
    expect(
      screen.getByRole("article").querySelector('a[href="/people"]'),
    ).toBeTruthy();
  });
});
