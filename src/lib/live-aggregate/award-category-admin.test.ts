import { describe, expect, it } from "vitest";
import { parseAwardCategoryWriteInput } from "./award-category-admin";
import { slugifyAwardCategoryId } from "./award-category-defs";

describe("parseAwardCategoryWriteInput", () => {
  it("requires a name and a whole-number order", () => {
    expect(parseAwardCategoryWriteInput({ label: "  ", sortOrder: 1 })).toEqual(
      { error: "Name is required." },
    );
    expect(
      parseAwardCategoryWriteInput({ label: "Best Widget", sortOrder: 1.5 }),
    ).toEqual({ error: "Order must be a whole number from 1 to 9999." });
  });

  it("accepts flags and maps group and eligibility", () => {
    expect(
      parseAwardCategoryWriteInput({
        label: "Best Widget",
        description: "A machine you love.",
        categoryGroup: "systems",
        eligibility: "any_year",
        sortOrder: "12",
        allowEditions: true,
        allowDlcAddon: true,
        currentOrPreviousYear: true,
        active: true,
      }),
    ).toEqual({
      label: "Best Widget",
      description: "A machine you love.",
      categoryGroup: "systems",
      eligibility: "any_year",
      sortOrder: 12,
      allowEditions: true,
      allowDlcAddon: true,
      currentOrPreviousYear: true,
      active: true,
    });
  });
});

describe("slugifyAwardCategoryId", () => {
  it("builds a stable id from the name", () => {
    expect(slugifyAwardCategoryId("Best Widget!")).toBe("best-widget");
    expect(slugifyAwardCategoryId("  ")).toBe("award");
  });
});
