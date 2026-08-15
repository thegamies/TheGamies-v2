import { describe, expect, it } from "vitest";
import {
  awardGroupsPresent,
  filterAwardCategories,
  sortedAwardCategories,
} from "./category-filter";

const sample = [
  {
    id: "a",
    label: "Best Story",
    description: "Narrative",
    sortOrder: 2,
    categoryGroup: "premier",
    eligibility: "current_year",
  },
  {
    id: "b",
    label: "Best Multiplayer",
    description: null,
    sortOrder: 1,
    categoryGroup: "major",
    eligibility: "current_or_active",
  },
  {
    id: "c",
    label: "Best RPG",
    description: "Role-playing",
    sortOrder: 3,
    categoryGroup: "genre",
    eligibility: "current_year",
  },
];

describe("sortedAwardCategories", () => {
  it("orders by sortOrder then label", () => {
    expect(sortedAwardCategories(sample).map((c) => c.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("filterAwardCategories", () => {
  it("filters by group", () => {
    expect(
      filterAwardCategories(sample, { query: "", group: "genre" }).map(
        (c) => c.id,
      ),
    ).toEqual(["c"]);
  });

  it("filters by search across label and group", () => {
    expect(
      filterAwardCategories(sample, { query: "multi", group: "all" }).map(
        (c) => c.id,
      ),
    ).toEqual(["b"]);
    expect(
      filterAwardCategories(sample, { query: "premier", group: "all" }).map(
        (c) => c.id,
      ),
    ).toEqual(["a"]);
  });

  it("combines search and group", () => {
    expect(
      filterAwardCategories(sample, { query: "best", group: "genre" }).map(
        (c) => c.id,
      ),
    ).toEqual(["c"]);
  });
});

describe("awardGroupsPresent", () => {
  it("includes All plus groups that appear", () => {
    expect(awardGroupsPresent(sample)).toEqual([
      "all",
      "premier",
      "major",
      "genre",
    ]);
  });
});
