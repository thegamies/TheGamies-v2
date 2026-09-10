import { describe, expect, it } from "vitest";
import { mergeEditionBallotCategories } from "./edition-ballot-categories";
import type { CustomCategoryView } from "./custom-category-types";
import {
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
} from "./custom-category-types";

function custom(
  partial: Partial<CustomCategoryView> & Pick<CustomCategoryView, "id" | "name" | "sortOrder">,
): CustomCategoryView {
  return {
    editionId: "ed",
    description: "desc",
    imageUrl: null,
    answerType: "any_game",
    eligibility: "current_year",
    entries: [],
    ...partial,
  };
}

describe("mergeEditionBallotCategories", () => {
  it("interleaves site and custom by shared sortOrder", () => {
    const merged = mergeEditionBallotCategories({
      site: [
        {
          id: "site-a",
          label: "Best Story",
          description: null,
          sortOrder: 0,
          categoryGroup: "premier",
          eligibility: "current_year",
          allowEditions: false,
        },
        {
          id: "site-b",
          label: "Best Indie",
          description: null,
          sortOrder: 2,
          categoryGroup: "major",
          eligibility: "current_year",
          allowEditions: false,
        },
      ],
      custom: [
        custom({
          id: "custom-1",
          name: "Community Pick",
          sortOrder: 1,
          answerType: "selected_games",
          eligibility: "any_year",
        }),
      ],
    });
    expect(merged.map((m) => `${m.kind}:${m.id}`)).toEqual([
      "site:site-a",
      "custom:custom-1",
      "site:site-b",
    ]);
  });
});

describe("custom category eligibility helpers", () => {
  it("parses known modes and defaults unknown", () => {
    expect(parseCustomCategoryEligibility("upcoming")).toBe("upcoming");
    expect(parseCustomCategoryEligibility("current_or_active")).toBe("any_year");
    expect(parseCustomCategoryEligibility("active_in_year")).toBe("any_year");
    expect(parseCustomCategoryEligibility("nope")).toBe("current_year");
  });

  it("uses eligibility for any_game, selected_games, and text_game", () => {
    expect(customAnswerTypeUsesEligibility("any_game")).toBe(true);
    expect(customAnswerTypeUsesEligibility("selected_games")).toBe(true);
    expect(customAnswerTypeUsesEligibility("text_game")).toBe(true);
    expect(customAnswerTypeUsesEligibility("text_only")).toBe(false);
  });
});
