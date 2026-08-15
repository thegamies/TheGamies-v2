import { describe, expect, it } from "vitest";
import {
  AWARD_CATEGORY_DEFS,
  parseAwardCategoryGroup,
  parseLiveStandingsView,
  parseStandingsCategoryGroup,
  standingsQueryString,
} from "./award-category-defs";

describe("AWARD_CATEGORY_DEFS", () => {
  it("has unique ids and increasing sort order", () => {
    const ids = AWARD_CATEGORY_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orders = AWARD_CATEGORY_DEFS.map((d) => d.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(orders[0]).toBe(2);
    expect(orders.at(-1)).toBe(87);
    expect(AWARD_CATEGORY_DEFS.every((d) => d.description.length > 0)).toBe(
      true,
    );
    expect(AWARD_CATEGORY_DEFS).toHaveLength(86);
  });

  it("parses groups and standings query strings", () => {
    expect(parseAwardCategoryGroup("gameplay")).toBe("gameplay");
    expect(parseAwardCategoryGroup("nope")).toBe("premier");
    expect(parseStandingsCategoryGroup(undefined)).toBe("all");
    expect(parseStandingsCategoryGroup("all")).toBe("all");
    expect(parseStandingsCategoryGroup("fun")).toBe("fun");
    expect(standingsQueryString({})).toBe("");
    expect(standingsQueryString({ group: "all" })).toBe("");
    expect(standingsQueryString({ group: "premier" })).toBe("?group=premier");
    expect(standingsQueryString({ page: 2, group: "fun" })).toBe(
      "?page=2&group=fun",
    );
    expect(standingsQueryString({ view: "categories" })).toBe(
      "?view=categories",
    );
    expect(
      standingsQueryString({
        view: "category",
        category: "best-game-design",
        group: "premier",
      }),
    ).toBe("?group=premier&view=category&category=best-game-design");
  });

  it("parses live standings views", () => {
    expect(parseLiveStandingsView("categories")).toBe("categories");
    expect(parseLiveStandingsView("category")).toBe("category");
    expect(parseLiveStandingsView("goty")).toBe("goty");
    expect(parseLiveStandingsView("nope")).toBe("goty");
    expect(parseLiveStandingsView(undefined)).toBe("goty");
  });
});
