import { describe, expect, it } from "vitest";
import { seedCategoryRows, TGA_2025_CATEGORIES } from "./category-seed";
import { tga2025NomineeCoverage } from "./nominee-seed";
import { nomineeMatchesWinner, tga2025WinnerCoverage } from "./winner-seed";

describe("TGA 2025 seed", () => {
  it("has unique labels and 30 awards", () => {
    expect(TGA_2025_CATEGORIES).toHaveLength(30);
    const labels = TGA_2025_CATEGORIES.map((row) => row.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("marks performance and adaptation as other", () => {
    expect(
      TGA_2025_CATEGORIES.find((row) => row.label === "Best Performance")?.kind,
    ).toBe("other");
    expect(
      TGA_2025_CATEGORIES.find((row) => row.label === "Best Adaptation")?.kind,
    ).toBe("other");
    expect(
      TGA_2025_CATEGORIES.find((row) => row.label === "Game of the Year")?.kind,
    ).toBe("game");
  });

  it("has nominees for every 2025 category", () => {
    expect(tga2025NomineeCoverage()).toEqual({
      missingCategories: [],
      extraCategories: [],
    });
  });

  it("has a winner for every 2025 category", () => {
    expect(tga2025WinnerCoverage()).toEqual({
      missingCategories: [],
      extraCategories: [],
    });
    expect(
      nomineeMatchesWinner("Jennifer English — Clair Obscur: Expedition 33", [
        "Jennifer English",
      ]),
    ).toBe(true);
  });

  it("assigns 1-based sort order", () => {
    const rows = seedCategoryRows();
    expect(rows[0]?.sortOrder).toBe(1);
    expect(rows.at(-1)?.sortOrder).toBe(30);
  });
});
