/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityOverviewCreateTga } from "./CommunityOverviewCreateTga";

vi.mock("@/app/communities/[slug]/the-game-awards/actions", () => ({
  createCommunityTgaYearAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("CommunityOverviewCreateTga", () => {
  it("offers one-click create for the chosen year", () => {
    render(<CommunityOverviewCreateTga slug="demo" year={2026} />);
    expect(
      screen.getByRole("heading", { name: /Video Game Awards Pick/i }),
    ).toBeTruthy();
    expect(screen.getByText(/is on for the site/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Create 2026 Pick’em" }),
    ).toBeTruthy();
    expect(
      (screen.getByDisplayValue("ballot") as HTMLInputElement).name,
    ).toBe("dest");
    expect(
      (screen.getByDisplayValue("2026") as HTMLInputElement).name,
    ).toBe("year");
  });
});
