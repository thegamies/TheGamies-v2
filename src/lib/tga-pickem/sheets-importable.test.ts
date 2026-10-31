import { describe, expect, it, vi } from "vitest";
import { hasImportableSiteTgaSheet, siteSheetHasContent } from "./sheets";

describe("siteSheetHasContent", () => {
  it("treats picks or a World Premieres guess as content", () => {
    expect(
      siteSheetHasContent({ picks: {}, worldPremieresGuess: null }),
    ).toBe(false);
    expect(
      siteSheetHasContent({ picks: { c1: "n1" }, worldPremieresGuess: null }),
    ).toBe(true);
    expect(
      siteSheetHasContent({ picks: {}, worldPremieresGuess: 4 }),
    ).toBe(true);
  });
});

describe("hasImportableSiteTgaSheet", () => {
  it("is false when no site sheet row exists", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as never;
    await expect(hasImportableSiteTgaSheet("p1", 2026, db)).resolves.toBe(
      false,
    );
  });

  it("is true when the site sheet has a guess or non-empty mask", async () => {
    const withGuess = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                { worldPremieresGuess: 3, ballotMask: null },
              ]),
          }),
        }),
      }),
    } as never;
    await expect(
      hasImportableSiteTgaSheet("p1", 2026, withGuess),
    ).resolves.toBe(true);

    const withMask = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                { worldPremieresGuess: null, ballotMask: Buffer.from([0, 2]) },
              ]),
          }),
        }),
      }),
    } as never;
    await expect(
      hasImportableSiteTgaSheet("p1", 2026, withMask),
    ).resolves.toBe(true);
  });

  it("is false for an empty saved mask with no guess", async () => {
    const db = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                { worldPremieresGuess: null, ballotMask: Buffer.from([0, 0]) },
              ]),
          }),
        }),
      })),
    } as never;
    await expect(hasImportableSiteTgaSheet("p1", 2026, db)).resolves.toBe(
      false,
    );
  });
});
