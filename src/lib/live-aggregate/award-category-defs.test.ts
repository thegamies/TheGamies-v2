import { describe, expect, it } from "vitest";
import {
  AWARD_CATEGORY_DEFS,
  parseAwardCategoryGroup,
  standingsQueryString,
} from "./award-category-defs";

describe("AWARD_CATEGORY_DEFS", () => {
  it("has unique ids and increasing sort order", () => {
    const ids = AWARD_CATEGORY_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orders = AWARD_CATEGORY_DEFS.map((d) => d.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(orders[0]).toBe(2);
    expect(orders.at(-1)).toBe(64);
  });

  it("parses groups and standings query strings", () => {
    expect(parseAwardCategoryGroup("gameplay")).toBe("gameplay");
    expect(parseAwardCategoryGroup("nope")).toBe("premier");
    expect(standingsQueryString({ group: "premier" })).toBe("");
    expect(standingsQueryString({ page: 2, group: "fun" })).toBe(
      "?page=2&group=fun",
    );
  });
});
