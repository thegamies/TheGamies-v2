/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPickemPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about/pickem",
}));

describe("AboutPickemPage", () => {
  it("keeps Pick’em off the GOTY board", () => {
    render(<AboutPickemPage />);
    expect(screen.getByRole("heading", { name: "Pick’em" })).toBeTruthy();
    expect(screen.getByText(/does not feed the GOTY board/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Video Game Awards Pick’em" }).getAttribute("href"),
    ).toBe("/the-game-awards");
  });
});
