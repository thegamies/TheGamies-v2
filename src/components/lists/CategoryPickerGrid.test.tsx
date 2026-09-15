/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryPickerGrid } from "./CategoryPickerGrid";

afterEach(() => {
  cleanup();
});

describe("CategoryPickerGrid tiles", () => {
  it("reserves three title lines on every award square", () => {
    render(
      <CategoryPickerGrid
        categories={[
          {
            id: "narrative",
            label: "Best Story",
            description: null,
            categoryGroup: "premier",
            eligibility: "current_year",
          },
          {
            id: "best-game-to-play-with-friends",
            label: "Best Game to Play With Friends",
            description: null,
            categoryGroup: "community",
            eligibility: "current_or_active",
          },
        ]}
        onSelect={vi.fn()}
      />,
    );

    const short = screen.getByRole("button", { name: /Best Story/i });
    const long = screen.getByRole("button", {
      name: /Best Game to Play With Friends/i,
    });

    for (const tile of [short, long]) {
      const title = tile.querySelector(".font-display");
      expect(title).toBeTruthy();
      expect(title).toHaveClass("line-clamp-3");
      expect(title?.parentElement).toHaveClass("h-[3lh]", "items-center");
    }
  });
});
