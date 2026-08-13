import { describe, expect, it } from "vitest";
import {
  applyCategoryRevealGridColumns,
  categoryRevealAwardLocalT,
  categoryRevealAwardScrollUnits,
  categoryRevealCeremonyOrder,
  CATEGORY_REVEAL_COL_PX,
  categoryRevealColPx,
  CATEGORY_REVEAL_MD_MIN_PX,
  categoryRevealPlaceGridEnter,
  categoryRevealPlaceLabelEnter,
  categoryRevealPlaceNumberEnter,
  categoryRevealPlaceOpen,
  categoryRevealPlaceOpens,
  categoryRevealPlaceTranslateX,
  categoryRevealSlotDensity,
  categoryRevealStackRows,
  CATEGORY_REVEAL_EXIT_AT,
} from "./edition-reveal-category-ties";

describe("categoryRevealStackRows", () => {
  it("uses 2 rows through four, then 3 rows", () => {
    expect(categoryRevealStackRows(1)).toBe(1);
    expect(categoryRevealStackRows(4)).toBe(2);
    expect(categoryRevealStackRows(5)).toBe(3);
  });
});

describe("categoryRevealSlotDensity", () => {
  it("keeps titles on sheets", () => {
    expect(categoryRevealSlotDensity(18).showTitles).toBe(true);
    expect(categoryRevealSlotDensity(18).stackRows).toBe(3);
  });

  it("keeps the ≤6 cover size for all 3-row mosaics", () => {
    const six = categoryRevealSlotDensity(6);
    const many = categoryRevealSlotDensity(30);
    expect(six.gridClassName).toContain("category-reveal-grid--dense");
    expect(many.gridClassName).toBe(six.gridClassName);
    expect(six.gridStyle?.gridTemplateRows).toBe("auto auto auto");
    expect(six.gridColumnPx).toBe(CATEGORY_REVEAL_COL_PX.dense.base);
    expect(six.gridStyle?.gridAutoColumns).toBe(
      `${CATEGORY_REVEAL_COL_PX.dense.base}px`,
    );
  });
});

describe("categoryRevealColPx", () => {
  it("uses base below md and md at/above 768", () => {
    expect(categoryRevealColPx("dense", CATEGORY_REVEAL_MD_MIN_PX - 1)).toBe(
      CATEGORY_REVEAL_COL_PX.dense.base,
    );
    expect(categoryRevealColPx("editorial", CATEGORY_REVEAL_MD_MIN_PX)).toBe(
      CATEGORY_REVEAL_COL_PX.editorial.md,
    );
  });

  it("forces literal px tracks on mosaic grids", () => {
    const props = new Map<string, string>();
    const grid = {
      classList: {
        contains: (name: string) =>
          name === "category-reveal-grid--dense" ||
          name === "category-reveal-grid",
      },
      style: {
        setProperty: (name: string, value: string) => {
          props.set(name, value);
        },
      },
    } as unknown as HTMLElement;

    applyCategoryRevealGridColumns(grid, 390);
    expect(props.get("grid-auto-columns")).toBe(
      `${CATEGORY_REVEAL_COL_PX.dense.base}px`,
    );
    applyCategoryRevealGridColumns(grid, 900);
    expect(props.get("grid-auto-columns")).toBe(
      `${CATEGORY_REVEAL_COL_PX.dense.md}px`,
    );
  });
});

describe("category reveal place open", () => {
  it("opens present places in ceremony order", () => {
    const present = [1, 2, 3];
    const t = 0.28;
    expect(categoryRevealPlaceOpen(t, 3, present)).toBeGreaterThan(
      categoryRevealPlaceOpen(t, 2, present),
    );
    expect(categoryRevealPlaceOpen(t, 2, present)).toBeGreaterThanOrEqual(
      categoryRevealPlaceOpen(t, 1, present),
    );
  });

  it("opens a lone rank early instead of waiting for a missing #3/#2 beat", () => {
    const solo = [1];
    expect(categoryRevealPlaceOpen(0.2, 1, solo)).toBeGreaterThan(0.15);
    expect(categoryRevealPlaceOpen(0.55, 1, solo)).toBeCloseTo(1, 1);
    expect(categoryRevealPlaceOpen(0.55, 1, solo)).toBeGreaterThan(
      categoryRevealPlaceOpen(0.55, 1, [1, 2, 3]),
    );
  });

  it("fully opens #1 before exit on a full podium", () => {
    const present = [1, 2, 3];
    const open1 = categoryRevealPlaceOpen(CATEGORY_REVEAL_EXIT_AT, 1, present);
    expect(open1).toBeGreaterThan(0.98);
  });

  it("keeps earlier ranks fully open after later ones arrive", () => {
    const present = [1, 2, 3];
    expect(categoryRevealPlaceOpen(0.99, 3, present)).toBeCloseTo(1, 2);
    expect(categoryRevealPlaceOpen(0.99, 2, present)).toBeCloseTo(1, 2);
    expect(categoryRevealPlaceOpen(0.99, 1, present)).toBeCloseTo(1, 2);
  });

  it("finishes a place’s grid before the next rank starts", () => {
    const present = [1, 2, 3];
    // While #3’s covers are still arriving, #2 must not have started.
    const during3Grid = 0.28;
    expect(categoryRevealPlaceGridEnter(during3Grid, 3, present)).toBeGreaterThan(
      0,
    );
    expect(categoryRevealPlaceGridEnter(during3Grid, 3, present)).toBeLessThan(
      1,
    );
    expect(categoryRevealPlaceLabelEnter(during3Grid, 2, present)).toBe(0);

    // After #3 is fully in, #2 may begin.
    expect(categoryRevealPlaceGridEnter(0.42, 3, present)).toBeCloseTo(1, 1);
    expect(categoryRevealPlaceLabelEnter(0.48, 2, present)).toBeGreaterThan(0);
  });

  it("seats # / Tied before the game grid starts", () => {
    const present = [3];
    expect(categoryRevealPlaceLabelEnter(0.28, 3, present)).toBeGreaterThan(
      0.85,
    );
    expect(categoryRevealPlaceGridEnter(0.28, 3, present)).toBe(0);
    expect(categoryRevealPlaceLabelEnter(0.4, 3, present)).toBeCloseTo(1, 1);
    expect(categoryRevealPlaceGridEnter(0.4, 3, present)).toBeGreaterThan(0);
  });

  it("keeps the rank number in sync with the label enter", () => {
    const present = [3];
    const t = 0.2;
    expect(categoryRevealPlaceNumberEnter(t, 3, present)).toBe(
      categoryRevealPlaceLabelEnter(t, 3, present),
    );
  });
});

describe("categoryRevealCeremonyOrder", () => {
  it("orders #3 then #2 then #1 among present places", () => {
    expect(categoryRevealCeremonyOrder([1, 3])).toEqual([3, 1]);
  });
});

describe("categoryRevealAwardScrollUnits", () => {
  it("gives one-place awards less scroll than a full podium", () => {
    expect(categoryRevealAwardScrollUnits(1)).toBeLessThan(
      categoryRevealAwardScrollUnits(3),
    );
  });
});

describe("categoryRevealAwardLocalT", () => {
  it("advances a short award faster through chapter progress", () => {
    const units = [0.78, 1.7];
    const shortAtHalf = categoryRevealAwardLocalT(0.35, 0, units);
    const longAtSame = categoryRevealAwardLocalT(0.35, 1, units);
    expect(shortAtHalf).toBeGreaterThan(longAtSame);
  });
});

describe("categoryRevealPlaceTranslateX", () => {
  const layouts = [
    { place: 1, left: 0, width: 120 },
    { place: 2, left: 120, width: 160 },
    { place: 3, left: 280, width: 180 },
  ] as const;
  const lead = 800;

  it("keeps every closed column fully off-screen left", () => {
    const opens = { 1: 0, 2: 0, 3: 0 };
    for (const row of layouts) {
      const x = categoryRevealPlaceTranslateX(row.place, layouts, opens, lead);
      expect(row.left + x).toBeLessThanOrEqual(-lead + 0.5);
    }
  });

  it("slides #3 onto stage-left first, then packs #2 and #1", () => {
    const only3 = categoryRevealPlaceTranslateX(
      3,
      layouts,
      { 1: 0, 2: 0, 3: 1 },
      lead,
    );
    expect(layouts[2].left + only3).toBeCloseTo(0, 5);

    const with2Opens = { 1: 0, 2: 1, 3: 1 };
    expect(
      layouts[1].left +
        categoryRevealPlaceTranslateX(2, layouts, with2Opens, lead),
    ).toBeCloseTo(0, 5);
    expect(
      layouts[2].left +
        categoryRevealPlaceTranslateX(3, layouts, with2Opens, lead),
    ).toBeCloseTo(layouts[1].width, 5);

    const allOpen = { 1: 1, 2: 1, 3: 1 };
    expect(
      layouts[0].left +
        categoryRevealPlaceTranslateX(1, layouts, allOpen, lead),
    ).toBeCloseTo(0, 5);
    expect(
      layouts[1].left +
        categoryRevealPlaceTranslateX(2, layouts, allOpen, lead),
    ).toBeCloseTo(layouts[0].width, 5);
    expect(
      layouts[2].left +
        categoryRevealPlaceTranslateX(3, layouts, allOpen, lead),
    ).toBeCloseTo(layouts[0].width + layouts[1].width, 5);
  });

  it("rests at natural layout when reduced", () => {
    const opens = categoryRevealPlaceOpens(0, layouts, true);
    expect(categoryRevealPlaceTranslateX(1, layouts, opens, lead)).toBe(0);
    expect(categoryRevealPlaceTranslateX(2, layouts, opens, lead)).toBe(0);
    expect(categoryRevealPlaceTranslateX(3, layouts, opens, lead)).toBe(0);
  });

  it("keeps a gap between packed ranks", () => {
    const gap = 20;
    const with2 = { 1: 0, 2: 1, 3: 1 };
    // Layouts without flex gap in `left` — pack math must still insert gap.
    const flush = [
      { place: 1, left: 0, width: 120 },
      { place: 2, left: 120, width: 160 },
      { place: 3, left: 280, width: 180 },
    ] as const;
    const x2 = categoryRevealPlaceTranslateX(2, flush, with2, lead, gap);
    const x3 = categoryRevealPlaceTranslateX(3, flush, with2, lead, gap);
    expect(flush[1].left + x2).toBeCloseTo(0, 5);
    expect(flush[2].left + x3).toBeCloseTo(flush[1].width + gap, 5);
  });

  it("packs from stage-left (not centered)", () => {
    const opens = { 1: 0, 2: 0, 3: 1 };
    const x = categoryRevealPlaceTranslateX(3, layouts, opens, lead, 0);
    expect(layouts[2].left + x).toBeCloseTo(0, 5);
  });
});
