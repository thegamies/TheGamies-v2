/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameCategoryWins } from "./GameCategoryWins";

describe("GameCategoryWins", () => {
  it("links year and category to the public category board", () => {
    render(
      <GameCategoryWins
        wins={[
          { year: 2026, categoryId: "narrative", label: "Best Narrative" },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: "2026 · Best Narrative" });
    expect(link.getAttribute("href")).toBe(
      "/game-of-the-year/2026?view=categories",
    );
  });
});
