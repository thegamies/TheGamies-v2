/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutSectionNav } from "./AboutSectionNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/library",
}));

describe("AboutSectionNav", () => {
  it("marks the current About section", () => {
    render(<AboutSectionNav />);
    expect(
      screen.getByRole("link", { name: "Library" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Overview" }).getAttribute("href"),
    ).toBe("/about");
  });
});
