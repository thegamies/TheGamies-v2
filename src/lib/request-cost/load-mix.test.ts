import { describe, expect, it } from "vitest";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  buildLoadGets,
  buildLoadWrites,
  mixUsesPromotedTgaYear,
  mixUsesShowcaseSlug,
  pickWeighted,
} from "./load-mix";

const urls = {
  communitySlug: LOADTEST_COMMUNITY.slug,
  fillingYear: 2026,
  resultsYear: 2025,
  resultsCategoryId: "cat1",
  tgaOpenYear: LOADTEST_TGA_OPEN_YEAR,
  tgaLockedYear: LOADTEST_TGA_LOCKED_YEAR,
  game: { id: "g1", slug: "hades", igdbId: 99 },
};

const scenarios: LoadtestScenario[] = [
  "general",
  "pickem-open",
  "pickem-locked",
  "editions-filling",
  "editions-results",
];

describe("buildLoadGets", () => {
  it("includes the general mix on every scenario", () => {
    for (const scenario of scenarios) {
      const paths = buildLoadGets(scenario, urls).map((item) => item.path);
      expect(paths).toContain("/");
      expect(paths).toContain("/games");
      expect(paths).toContain("/games/hades");
      expect(paths).toContain("/rankings");
      expect(mixUsesShowcaseSlug(buildLoadGets(scenario, urls))).toBe(false);
    }
  });

  it("uses reserved TGA years, not the current show year", () => {
    const open = buildLoadGets("pickem-open", urls);
    expect(open.some((item) => item.path.includes(String(LOADTEST_TGA_OPEN_YEAR)))).toBe(
      true,
    );
    expect(mixUsesPromotedTgaYear(open)).toBe(false);
    const locked = buildLoadGets("pickem-locked", urls);
    expect(
      locked.some((item) => item.path.includes(String(LOADTEST_TGA_LOCKED_YEAR))),
    ).toBe(true);
    expect(locked.some((item) => item.path.includes(String(LOADTEST_TGA_OPEN_YEAR)))).toBe(
      false,
    );
  });

  it("does not point at the QA showcase community", () => {
    const results = buildLoadGets("editions-results", urls);
    expect(results.some((item) => item.path.includes("/edition/2025"))).toBe(true);
    expect(
      results.some((item) =>
        item.path.includes(`/communities/${QA_COMMUNITIES.showcase.slug}`),
      ),
    ).toBe(false);
  });
});

describe("buildLoadWrites", () => {
  it("omits pickem and ballot writes on locked results", () => {
    expect(buildLoadWrites("pickem-locked").map((item) => item.op)).toEqual([
      "list",
      "library",
    ]);
    expect(buildLoadWrites("editions-results").map((item) => item.op)).toEqual([
      "list",
      "library",
    ]);
    expect(buildLoadWrites("pickem-open").some((item) => item.op === "pickem")).toBe(
      true,
    );
    expect(
      buildLoadWrites("editions-filling").some((item) => item.op === "ballot"),
    ).toBe(true);
  });
});

describe("pickWeighted", () => {
  it("returns the only item", () => {
    expect(pickWeighted([{ weight: 1, id: "a" }], () => 0.5)).toEqual({
      weight: 1,
      id: "a",
    });
  });
});
