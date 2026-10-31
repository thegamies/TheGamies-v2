import { describe, expect, it } from "vitest";
import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_SHARE_LIST_SLUG,
  LOADTEST_TGA_YEAR,
  loadtestAccount,
  type LoadtestScenario,
} from "@/lib/qa/loadtest";
import {
  buildLoadGets,
  buildLoadWrites,
  mixUsesUnexpectedTgaYear,
  mixUsesShowcaseSlug,
  loadShareListPath,
  pickemPhaseAt,
  pickLoadtestGotyCategory,
  pickLoadtestUsername,
  pickWeighted,
  siteGotyCategoryPath,
  withScaleCommunitySlug,
} from "./load-mix";

const urls = {
  communitySlug: LOADTEST_COMMUNITY.slug,
  fillingYear: 2026,
  resultsYear: 2025,
  resultsCategoryId: "cat1",
  tgaYear: LOADTEST_TGA_YEAR,
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

const scenarios: LoadtestScenario[] = ["general", "pickem", "editions"];

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
      expect(buildLoadGets(scenario, urls).some((item) => item.pickShare)).toBe(
        true,
      );
      expect(mixUsesShowcaseSlug(buildLoadGets(scenario, urls))).toBe(false);
    }
  });

  it("weights hub search and typeahead the same", () => {
    const gets = buildLoadGets("general", urls);
    const browse = gets.find((item) => item.pickSearch === "browse");
    const api = gets.find((item) => item.pickSearch === "api");
    expect(browse?.weight).toBe(api?.weight);
    expect(browse?.weight).toBeGreaterThan(0);
  });

  it("uses the 2025 Pick’em year for ballot then standings", () => {
    const open = buildLoadGets("pickem", urls, "open");
    expect(open.some((item) => item.path.includes(`/the-game-awards/${LOADTEST_TGA_YEAR}`))).toBe(
      true,
    );
    expect(mixUsesUnexpectedTgaYear(open)).toBe(false);
    const openStandings = open.filter((item) => item.path.includes("view=standings"));
    const openBallot = open.filter(
      (item) => item.group === "pickem" && !item.path.includes("view=standings"),
    );
    const openBallotWeight = openBallot.reduce((sum, item) => sum + item.weight, 0);
    const openStandingsWeight = openStandings.reduce((sum, item) => sum + item.weight, 0);
    expect(openBallotWeight).toBeGreaterThan(openStandingsWeight);

    const locked = buildLoadGets("pickem", urls, "locked");
    const lockedStandings = locked.filter((item) =>
      item.path.includes("view=standings"),
    );
    const lockedStandingsWeight = lockedStandings.reduce(
      (sum, item) => sum + item.weight,
      0,
    );
    const lockedBallotWeight = locked
      .filter((item) => item.group === "pickem" && !item.path.includes("view=standings"))
      .reduce((sum, item) => sum + item.weight, 0);
    expect(lockedStandingsWeight).toBeGreaterThan(lockedBallotWeight);
  });

  it("reads Reveal only after the edition is published", () => {
    const open = buildLoadGets("editions", urls, "open");
    const locked = buildLoadGets("editions", urls, "locked");
    expect(open.some((item) => item.path.includes("view=reveal"))).toBe(false);
    expect(locked.some((item) => item.path.includes("view=reveal"))).toBe(true);
  });

  it("does not point at the QA showcase community", () => {
    const results = buildLoadGets("editions", urls, "locked");
    expect(results.some((item) => item.path.includes("/edition/2025"))).toBe(true);
    expect(
      results.some((item) =>
        item.path.includes(`/communities/${QA_COMMUNITIES.showcase.slug}`),
      ),
    ).toBe(false);
  });
});

describe("buildLoadWrites", () => {
  it("omits pickem writes after lock and ballot writes on results", () => {
    expect(buildLoadWrites("pickem", "locked").map((item) => item.op)).toEqual([
      "list-create",
      "list-edit",
      "list-reorder",
      "list-delete",
      "library",
    ]);
    expect(buildLoadWrites("editions", "locked").map((item) => item.op)).toEqual([
      "list-create",
      "list-edit",
      "list-reorder",
      "list-delete",
      "library",
    ]);
    expect(buildLoadWrites("pickem", "open").some((item) => item.op === "pickem")).toBe(
      true,
    );
    expect(
      buildLoadWrites("editions", "open").some((item) => item.op === "ballot"),
    ).toBe(true);
  });

  it("writes both pickem and ballots while scale is open", () => {
    const ops = buildLoadWrites("scale", "open").map((item) => item.op);
    expect(ops).toContain("pickem");
    expect(ops).toContain("ballot");
    expect(buildLoadWrites("scale", "locked").map((item) => item.op)).not.toContain(
      "pickem",
    );
  });
});

describe("scale mix", () => {
  it("rotates community Pick’em and open editions across seed_pem slugs", () => {
    const open = buildLoadGets("scale", urls, "open");
    expect(open.some((item) => item.pickScaleCommunity)).toBe(true);
    expect(
      open.some(
        (item) =>
          item.group === "edition" &&
          item.path.includes(`/communities/${LOADTEST_COMMUNITY.slug}/edition/`),
      ),
    ).toBe(true);
    expect(open.some((item) => item.path.includes("view=reveal"))).toBe(false);
  });
});

describe("pickemPhaseAt", () => {
  it("flips to locked at halfway", () => {
    expect(pickemPhaseAt(0, 90_000)).toBe("open");
    expect(pickemPhaseAt(44_999, 90_000)).toBe("open");
    expect(pickemPhaseAt(45_000, 90_000)).toBe("locked");
  });
});

describe("withScaleCommunitySlug", () => {
  it("swaps only the community path segment", () => {
    expect(
      withScaleCommunitySlug(
        "/communities/seed_pem_0001/edition/2025",
        "seed_pem_0001",
        "seed_pem_0042",
      ),
    ).toBe("/communities/seed_pem_0042/edition/2025");
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
    expect(loadShareListPath(list)).toBe(
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
