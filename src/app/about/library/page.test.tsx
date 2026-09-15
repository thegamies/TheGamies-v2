/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutLibraryPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/library",
}));

describe("AboutLibraryPage", () => {
  it("lists shelf statuses and separates library from GOTY", () => {
    render(<AboutLibraryPage />);
    expect(screen.getByRole("heading", { name: "Library" })).toBeTruthy();
    expect(screen.getByText("Wishlist")).toBeTruthy();
    expect(screen.getByText(/does not automatically add it to your Game of the Year list/i)).toBeTruthy();
  });
});
