import { describe, expect, it } from "vitest";
import { MAX_CATEGORY_VOTES, replaceCategoryVotesSchema } from "./schema";
import {
  aggregateGotyContribForGame,
  buildGotyContribRows,
  mergeDirtyCategoryKeys,
  mergeDirtyGotyKeys,
  pointsForRank,
  sumContribForProfiles,
} from "./scoring";
import {
  browseInputForCategoryEligibility,
  categoryEligibilityError,
} from "./category-eligibility";
import { gotyEligibilityError } from "@/lib/lists/rules";
import { redactStandingsPage, clampStandingsPage, type StandingsPage } from "./service";
import { withDisplayRanksOnPage } from "@/lib/standings/shared-rank";

describe("buildGotyContribRows", () => {
  it("keeps top-10 scored non-adult rows", () => {
    expect(
      buildGotyContribRows([
        { gameId: "a", rank: 1 },
        { gameId: "b", rank: 11 },
        { gameId: "c", rank: 2, isAdult: true },
        { gameId: "d", rank: 3 },
      ]),
    ).toEqual([
      { gameId: "a", rank: 1, points: 10 },
      { gameId: "d", rank: 3, points: 8 },
    ]);
  });
});

describe("mergeDirtyGotyKeys", () => {
  it("unions old and new game ids across years", () => {
    expect(
      mergeDirtyGotyKeys(
        [
          { year: 2025, gameId: "a" },
          { year: 2026, gameId: "b" },
        ],
        [
          { year: 2026, gameId: "b" },
          { year: 2026, gameId: "c" },
        ],
      ),
    ).toEqual([
      { year: 2025, gameId: "a" },
      { year: 2026, gameId: "b" },
      { year: 2026, gameId: "c" },
    ]);
  });
});

describe("mergeDirtyCategoryKeys", () => {
  it("dirties at most old and new category-game pairs", () => {
    expect(
      mergeDirtyCategoryKeys(
        [{ year: 2026, categoryId: "narrative", gameId: "a" }],
        [{ year: 2026, categoryId: "narrative", gameId: "b" }],
      ),
    ).toEqual([
      { year: 2026, categoryId: "narrative", gameId: "a" },
      { year: 2026, categoryId: "narrative", gameId: "b" },
    ]);
  });
});

describe("aggregateGotyContribForGame", () => {
  it("sums points and rank buckets", () => {
    expect(
      aggregateGotyContribForGame([
        { rank: 1, points: pointsForRank(1) },
        { rank: 1, points: pointsForRank(1) },
        { rank: 3, points: pointsForRank(3) },
      ]),
    ).toEqual({
      score: 28,
      listMentions: 3,
      rankCounts: [2, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});

describe("sumContribForProfiles", () => {
  it("filters to member profiles for future community boards", () => {
    const scores = sumContribForProfiles(
      [
        { profileId: "p1", gameId: "g1", points: 10 },
        { profileId: "p2", gameId: "g1", points: 9 },
        { profileId: "p3", gameId: "g1", points: 8 },
      ],
      ["p1", "p3"],
    );
    expect(scores.get("g1")).toBe(18);
  });
});

describe("GOTY category vote eligibility", () => {
  const year = 2026;
  const now = new Date("2026-08-01");
  const base = {
    id: "g1",
    year: 2026,
    firstReleaseDate: new Date("2026-03-01"),
    versionParentIgdbId: null,
    isAdult: false,
  };

  it("reuses list GOTY rules for current-year categories", () => {
    expect(gotyEligibilityError(base, year, now)).toBeNull();
    expect(
      categoryEligibilityError(base, year, "current_year", { now }),
    ).toBeNull();
    expect(
      categoryEligibilityError({ ...base, year: 2025 }, year, "current_year", {
        now,
      }),
    ).toMatch(/2026/);
  });

  it("allows earlier released titles for current-or-active", () => {
    expect(
      categoryEligibilityError({ ...base, year: 2024 }, year, "current_or_active", {
        now,
      }),
    ).toBeNull();
  });

  it("allows remake editions when the category permits them", () => {
    expect(
      categoryEligibilityError(
        { ...base, versionParentIgdbId: 1 },
        year,
        "current_year",
        { now, allowEditions: true },
      ),
    ).toBeNull();
  });

  it("requires later years for upcoming eligibility, not this year", () => {
    expect(
      categoryEligibilityError(base, year, "upcoming", { now }),
    ).toMatch(/later years/i);
    expect(
      categoryEligibilityError(
        {
          ...base,
          firstReleaseDate: new Date("2026-12-01"),
        },
        year,
        "upcoming",
        { now },
      ),
    ).toMatch(/later years/i);
    expect(
      categoryEligibilityError(
        { ...base, year: 2027, firstReleaseDate: new Date("2027-03-01") },
        year,
        "upcoming",
        { now },
      ),
    ).toBeNull();
    expect(browseInputForCategoryEligibility(year, "upcoming", false)).toEqual(
      expect.objectContaining({ yearKnownAtLeast: 2027 }),
    );
  });
});

describe("replaceCategoryVotesSchema", () => {
  it("allows one game per category", () => {
    expect(
      replaceCategoryVotesSchema.safeParse([
        { categoryId: "narrative", gameId: "11111111-1111-4111-8111-111111111111" },
        { categoryId: "indie", gameId: "22222222-2222-4222-8222-222222222222" },
      ]).success,
    ).toBe(true);
  });

  it("rejects duplicate categories", () => {
    expect(
      replaceCategoryVotesSchema.safeParse([
        { categoryId: "narrative", gameId: "11111111-1111-4111-8111-111111111111" },
        { categoryId: "narrative", gameId: "22222222-2222-4222-8222-222222222222" },
      ]).success,
    ).toBe(false);
  });

  it("allows a full site-catalog set of award picks", () => {
    const votes = Array.from({ length: 86 }, (_, i) => ({
      categoryId: `cat-${i}`,
      gameId: "11111111-1111-4111-8111-111111111111",
    }));
    expect(replaceCategoryVotesSchema.safeParse(votes).success).toBe(true);
    expect(
      replaceCategoryVotesSchema.safeParse(
        Array.from({ length: MAX_CATEGORY_VOTES + 1 }, (_, i) => ({
          categoryId: `cat-${i}`,
          gameId: "11111111-1111-4111-8111-111111111111",
        })),
      ).success,
    ).toBe(false);
  });
});

describe("clampStandingsPage", () => {
  it("clamps to valid 1-based pages", () => {
    expect(clampStandingsPage(0, 3)).toBe(1);
    expect(clampStandingsPage(-2, 3)).toBe(1);
    expect(clampStandingsPage(2, 3)).toBe(2);
    expect(clampStandingsPage(99, 3)).toBe(3);
    expect(clampStandingsPage(1, 0)).toBe(1);
  });
});

describe("redactStandingsPage", () => {
  const page: StandingsPage = {
    year: 2026,
    listCount: 2,
    detailedStatsRevealed: false,
    standingsVersion: 1,
    scoresFresh: true,
    page: 1,
    pageSize: 50,
    gotyTotal: 1,
    totalPages: 1,
    goty: [
      {
        place: 1,
        gameId: "g1",
        slug: "game",
        title: "Game",
        year: 2026,
        coverUrl: null,
        score: 20,
        listMentions: 2,
        rankCounts: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],
    categories: [
      {
        categoryId: "narrative",
        label: "Best Story",
        description: null,
        totalVotes: 2,
        rows: [
          {
            place: 1,
            gameId: "g1",
            slug: "game",
            title: "Game",
            coverUrl: null,
            voteCount: 2,
          },
        ],
      },
    ],
    categoryGroup: "premier",
    view: "goty",
    categoryId: null,
    categoryGameTotal: 0,
    gotyPublic: true,
    categoriesPublic: true,
  };

  it("hides scores but keeps ranks when unrevealed", () => {
    const redacted = redactStandingsPage(page);
    expect(redacted.goty[0]?.place).toBe(1);
    expect(redacted.goty[0]?.title).toBe("Game");
    expect(redacted.goty[0]?.score).toBeNull();
    expect(redacted.goty[0]?.rankCounts).toBeNull();
    expect(redacted.categories[0]?.rows[0]?.voteCount).toBeNull();
    expect(redacted.categories[0]?.totalVotes).toBe(2);
  });

  it("keeps scores when revealed", () => {
    const revealed = redactStandingsPage({
      ...page,
      detailedStatsRevealed: true,
    });
    expect(revealed.goty[0]?.score).toBe(20);
    expect(revealed.categories[0]?.rows[0]?.voteCount).toBe(2);
  });
});

describe("live page competition rank", () => {
  it("continues a split tie from higher_count then walks the page", () => {
    const numbered = withDisplayRanksOnPage(
      [
        { gameId: "a", score: 40 },
        { gameId: "b", score: 40 },
        { gameId: "c", score: 30 },
      ],
      (r) => r.score,
      { offset: 50, firstGroupRank: 49, mode: "competition" },
    ).map((r) => ({ ...r, place: r.rank }));
    expect(numbered.map((r) => r.place)).toEqual([49, 49, 53]);
  });

  it("continues a dense split tie then increments without skipping", () => {
    const numbered = withDisplayRanksOnPage(
      [
        { gameId: "a", score: 40 },
        { gameId: "b", score: 40 },
        { gameId: "c", score: 30 },
      ],
      (r) => r.score,
      { offset: 50, firstGroupRank: 12, mode: "dense" },
    ).map((r) => ({ ...r, place: r.rank }));
    expect(numbered.map((r) => r.place)).toEqual([12, 12, 13]);
  });
});
