import { describe, expect, it } from "vitest";
import { AWARD_CATEGORY_DEFS } from "./award-category-defs";

describe("award category catalog for seed", () => {
  it("ships a non-empty defs list that seed can ensure into the DB", () => {
    expect(AWARD_CATEGORY_DEFS.length).toBeGreaterThan(50);
    const ids = new Set(AWARD_CATEGORY_DEFS.map((d) => d.id));
    expect(ids.size).toBe(AWARD_CATEGORY_DEFS.length);
  });
});
