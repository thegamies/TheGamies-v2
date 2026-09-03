import { describe, expect, it } from "vitest";
import {
  expandNomineeSearchTitles,
  normalizeNomineeTitle,
  TGA_2025_NOMINEES,
} from "./nominee-seed";

describe("normalizeNomineeTitle", () => {
  it("treats punctuation variants as the same title", () => {
    expect(normalizeNomineeTitle("Clair Obscur: Expedition 33")).toBe(
      normalizeNomineeTitle("Clair Obscur Expedition 33"),
    );
    expect(normalizeNomineeTitle("Baldur's Gate 3")).toBe(
      normalizeNomineeTitle("Baldurs Gate 3"),
    );
  });

  it("treats roman numerals as the same as arabic", () => {
    expect(normalizeNomineeTitle("Baldur's Gate III")).toBe(
      normalizeNomineeTitle("Baldur's Gate 3"),
    );
    expect(normalizeNomineeTitle("The Witcher IV")).toBe(
      normalizeNomineeTitle("The Witcher 4"),
    );
  });
});

describe("2025 nominee seed", () => {
  it("does not include Megabonk in Best Debut Indie Game", () => {
    const debut = TGA_2025_NOMINEES["Best Debut Indie Game"] ?? [];
    expect(
      debut.some(
        (row) =>
          row.type === "game" &&
          row.titles.some((title) => /megabonk/i.test(title)),
      ),
    ).toBe(false);
  });

  it("includes community, mobile, and anticipated titles with catalog aliases", () => {
    const community = TGA_2025_NOMINEES["Best Community Support"] ?? [];
    expect(
      community.some(
        (row) =>
          row.type === "game" &&
          row.titles.some((title) => /baldur/i.test(title) && /III|3/.test(title)),
      ),
    ).toBe(true);

    const mobile = TGA_2025_NOMINEES["Best Mobile Game"] ?? [];
    expect(
      mobile.some(
        (row) =>
          row.type === "game" &&
          row.titles.some((title) => /phantom x/i.test(title)),
      ),
    ).toBe(true);
    expect(
      mobile.some(
        (row) =>
          row.type === "game" &&
          row.titles.some((title) => /sonic rumble party/i.test(title)),
      ),
    ).toBe(true);

    const anticipated = TGA_2025_NOMINEES["Most Anticipated Game"] ?? [];
    expect(
      anticipated.some(
        (row) =>
          row.type === "game" &&
          row.titles.some((title) => /witcher iv/i.test(title)),
      ),
    ).toBe(true);
  });

  it("expands 3/III search spellings for catalog lookup", () => {
    const titles = expandNomineeSearchTitles(["Baldur's Gate 3"]);
    expect(titles).toEqual(
      expect.arrayContaining(["Baldur's Gate 3", "Baldur's Gate III"]),
    );
  });
});
