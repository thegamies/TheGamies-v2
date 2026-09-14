/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
}));

describe("AboutPage", () => {
  it("explains the site and links feature pages", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "About" })).toBeTruthy();
    expect(
      screen.getByText(/place to rank Game of the Year/i),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "How rankings work" }).getAttribute(
        "href",
      ),
    ).toBe("/rankings");
    const article = screen.getByRole("article");
    expect(
      article.querySelector('a[href="/about/lists"]')?.textContent,
    ).toMatch(/Lists/);
    expect(
      article.querySelector('a[href="/game-of-the-year/2025/recap"]'),
    ).toBeNull();
  });
});
