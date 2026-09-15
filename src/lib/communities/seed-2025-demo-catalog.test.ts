import { describe, expect, it } from "vitest";
import { DEMO_2025_YEAR } from "./seed-2025-demo";
import { DEMO_2026_YEAR } from "./seed-2026-demo";
import { pickDemo2025CatalogId } from "./seed-2025-demo-catalog";

describe("pickDemo2025CatalogId", () => {
  it("prefers the catalog year when both years match the title", () => {
    const id = pickDemo2025CatalogId(
      ["Resident Evil Survival Unit"],
      [
        { id: "y2026", title: "Resident Evil Survival Unit", year: 2026 },
        { id: "y2025", title: "Resident Evil Survival Unit", year: 2025 },
      ],
    );
    expect(id).toBe("y2025");
  });

  it("rejects a later-year title when the year is required", () => {
    expect(
      pickDemo2025CatalogId(
        ["Resident Evil Requiem"],
        [{ id: "req", title: "Resident Evil Requiem", year: 2026 }],
        { year: DEMO_2025_YEAR, requireYear: true },
      ),
    ).toBeNull();
  });

  it("lets a curated GOTY title fall back if IGDB stored an earlier year", () => {
    expect(
      pickDemo2025CatalogId(
        ["Hades II"],
        [{ id: "hades", title: "Hades II", year: 2024 }],
        { year: DEMO_2025_YEAR, requireYear: false },
      ),
    ).toBe("hades");
  });

  it("requires catalog year 2026 for 2026 category picks", () => {
    expect(
      pickDemo2025CatalogId(
        ["The Blood of Dawnwalker"],
        [{ id: "old", title: "The Blood of Dawnwalker", year: 2025 }],
        { year: DEMO_2026_YEAR, requireYear: true },
      ),
    ).toBeNull();
    expect(
      pickDemo2025CatalogId(
        ["The Blood of Dawnwalker"],
        [
          { id: "old", title: "The Blood of Dawnwalker", year: 2025 },
          { id: "now", title: "The Blood of Dawnwalker", year: 2026 },
        ],
        { year: DEMO_2026_YEAR, requireYear: true },
      ),
    ).toBe("now");
  });
});
