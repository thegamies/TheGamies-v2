import { describe, expect, it } from "vitest";
import {
  AWARD_CATEGORY_DEFS,
  awardEligibilityCaption,
  awardEligibilityDescription,
  awardOfferedOnListYear,
  filterAwardsOfferedOnListYear,
  parseAwardCategoryEligibility,
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
    expect(orders).toEqual(Array.from({ length: 86 }, (_, i) => i + 1));
    expect(AWARD_CATEGORY_DEFS.every((d) => d.description.length > 0)).toBe(
      true,
    );
    expect(AWARD_CATEGORY_DEFS).toHaveLength(86);
    expect(AWARD_CATEGORY_DEFS[0]).toMatchObject({
      id: "best-gameplay",
      label: "Best Gameplay",
      group: "premier",
    });
    expect(AWARD_CATEGORY_DEFS.map((d) => d.id)).not.toContain(
      "best-game-design",
    );
  });

  it("uses three eligibility modes and maps legacy site values", () => {
    expect(
      AWARD_CATEGORY_DEFS.find((d) => d.id === "best-multiplayer")?.eligibility,
    ).toBe("current_year");
    expect(
      AWARD_CATEGORY_DEFS.find((d) => d.id === "best-ongoing-game")?.eligibility,
    ).toBe("any_year");
    expect(
      AWARD_CATEGORY_DEFS.find((d) => d.id === "most-anticipated-game")
        ?.eligibility,
    ).toBe("upcoming");
    expect(
      AWARD_CATEGORY_DEFS.find((d) => d.id === "best-game-you-finally-played")
        ?.eligibility,
    ).toBe("any_year");
    expect(parseAwardCategoryEligibility("current_or_active")).toBe(
      "current_year",
    );
    expect(parseAwardCategoryEligibility("active_in_year")).toBe("any_year");
    expect(awardEligibilityCaption("any_year", 2026)).toBe(
      "Any year released · 2026 or earlier",
    );
    expect(awardEligibilityDescription("any_year", 2026)).toBe(
      "Already released, 2026 or earlier.",
    );
  });

  it("offers ongoing and anticipated awards on current and previous years only", () => {
    const now = new Date("2026-09-09T12:00:00Z");
    expect(awardOfferedOnListYear("best-ongoing-game", 2026, now)).toBe(true);
    expect(awardOfferedOnListYear("most-anticipated-game", 2025, now)).toBe(
      true,
    );
    expect(awardOfferedOnListYear("best-ongoing-game", 2024, now)).toBe(false);
    expect(awardOfferedOnListYear("best-story", 2024, now)).toBe(true);
    expect(
      filterAwardsOfferedOnListYear(
        [
          { id: "best-ongoing-game" },
          { id: "narrative" },
        ],
        2024,
        { now, keepIds: new Set(["best-ongoing-game"]) },
      ).map((a) => a.id),
    ).toEqual(["best-ongoing-game", "narrative"]);
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
        category: "best-gameplay",
        group: "premier",
      }),
    ).toBe("?group=premier&view=category&category=best-gameplay");
  });

  it("parses live standings views", () => {
    expect(parseLiveStandingsView("categories")).toBe("categories");
    expect(parseLiveStandingsView("category")).toBe("category");
    expect(parseLiveStandingsView("goty")).toBe("goty");
    expect(parseLiveStandingsView("nope")).toBe("goty");
    expect(parseLiveStandingsView(undefined)).toBe("goty");
  });
});
