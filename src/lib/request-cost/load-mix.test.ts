import { describe, expect, it } from "vitest";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_SHARE_LIST_SLUG,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  loadtestAccount,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  buildLoadGets,
  buildLoadWrites,
  mixUsesPromotedTgaYear,
  mixUsesShowcaseSlug,
  loadShareListPath,
  pickLoadtestGotyCategory,
  pickLoadtestUsername,
  pickWeighted,
  siteGotyCategoryPath,
} from "./load-mix";

const urls = {
  communitySlug: LOADTEST_COMMUNITY.slug,
  fillingYear: 2026,
  resultsYear: 2025,
  resultsCategoryId: "cat1",
  tgaOpenYear: LOADTEST_TGA_OPEN_YEAR,
  tgaLockedYear: LOADTEST_TGA_LOCKED_YEAR,
  game: { id: "g1", slug: "hades", igdbId: 99 },
  writerCount: 10,
  lists: [
    {
      username: loadtestAccount(1).username,
      slug: LOADTEST_SHARE_LIST_SLUG,
      publicId: "share1",
    },
    {
      username: loadtestAccount(2).username,
      slug: LOADTEST_SHARE_LIST_SLUG,
      publicId: "share2",
    },
  ],
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
      expect(buildLoadGets(scenario, urls).some((item) => item.pickGame)).toBe(
        true,
      );
      expect(paths).toContain("/rankings");
      expect(paths).toContain("/game-of-the-year");
      expect(paths).toContain("/game-of-the-year/2025");
      expect(paths).toContain("/game-of-the-year/2025/categories");
      expect(buildLoadGets(scenario, urls).some((item) => item.pickCategory)).toBe(
        true,
      );
      expect(
        buildLoadGets(scenario, urls).some((item) => item.pickSearch === "browse"),
      ).toBe(true);
      expect(
        buildLoadGets(scenario, urls).some((item) => item.pickSearch === "api"),
      ).toBe(true);
      expect(paths).toContain("/create");
      expect(paths.some((path) => path.startsWith("/create/goty"))).toBe(true);
      expect(paths).toContain("/create/custom");
      expect(buildLoadGets(scenario, urls).some((item) => item.pickProfile)).toBe(
        true,
      );
      expect(buildLoadGets(scenario, urls).some((item) => item.pickShare === "l")).toBe(
        true,
      );
      expect(
        buildLoadGets(scenario, urls).some((item) => item.pickShare === "owned"),
      ).toBe(true);
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
      "list-create",
      "list-edit",
      "list-reorder",
      "list-delete",
      "library",
    ]);
    expect(buildLoadWrites("editions-results").map((item) => item.op)).toEqual([
      "list-create",
      "list-edit",
      "list-reorder",
      "list-delete",
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

describe("share list mix", () => {
  it("omits share URLs when ensure has not planted lists", () => {
    const { lists: _lists, ...withoutLists } = urls;
    expect(
      buildLoadGets("general", withoutLists).some((item) => item.pickShare),
    ).toBe(false);
  });

  it("builds share paths from a planted list", () => {
    const list = urls.lists[0]!;
    expect(loadShareListPath("l", list)).toBe("/l/share1");
    expect(loadShareListPath("owned", list)).toBe(
      `/u/${loadtestAccount(1).username}/${LOADTEST_SHARE_LIST_SLUG}`,
    );
  });
});

describe("pickLoadtestUsername", () => {
  it("stays inside the writer roster", () => {
    expect(pickLoadtestUsername(10, () => 0)).toBe("gamies_qa_load_001");
    expect(pickLoadtestUsername(10, () => 0.99)).toBe("gamies_qa_load_010");
  });
});

describe("site GOTY category mix", () => {
  it("opens a 2025 category board", () => {
    expect(siteGotyCategoryPath("narrative")).toBe(
      "/game-of-the-year/2025/categories?category=narrative",
    );
    expect(pickLoadtestGotyCategory(() => 0)).toBe("best-gameplay");
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
