import { describe, expect, it } from "vitest";
import { AWARD_CATEGORY_DEFS } from "@/lib/live-aggregate/award-category-defs";
import {
  DEMO_2025_CATEGORIES,
  DEMO_2025_CATEGORY_IDS,
  DEMO_2025_GOTY,
  DEMO_2025_LIST_SIZE,
  buildDemo2025CategoryVotes,
  combatFavoriteKey,
  mulberry32,
  pickDemoCategoryVote,
  pickDemoGotyList,
  resolveTitleDef,
  rngForVoter,
  seedCommunityDisplayName,
  tasteForIndex,
  uniqueTitlesForLookup,
  weightedSampleWithRng,
} from "./seed-2025-demo";
import { demo2025CategoriesForActiveAwards } from "./seed-2025-demo-catalog";

function fakeDemoCategoryPools() {
  return DEMO_2025_CATEGORIES.map((cat) => ({
    categoryId: cat.categoryId,
    games: cat.picks.flatMap((pick) => {
      const def = resolveTitleDef(pick);
      if (!def) return [];
      return [
        {
          key: pick.key,
          gameId: `g-${pick.key}`,
          weight: pick.weight,
          tags: def.tags,
        },
      ];
    }),
  }));
}

describe("2025 demo seed data", () => {
  it("keeps 60 GOTY sampling weights without normalizing", () => {
    expect(DEMO_2025_GOTY).toHaveLength(60);
    expect(DEMO_2025_GOTY.reduce((sum, row) => sum + row.weight, 0)).toBeGreaterThan(
      100,
    );
    expect(DEMO_2025_GOTY[0]?.key).toBe("clair-obscur");
    expect(DEMO_2025_GOTY[0]?.weight).toBe(100);
  });

  it("uses ten distinct event categories", () => {
    expect(DEMO_2025_CATEGORY_IDS).toHaveLength(10);
    expect(new Set(DEMO_2025_CATEGORY_IDS).size).toBe(10);
  });

  it("maps every demo award onto a site catalog id", () => {
    const ids = new Set(AWARD_CATEGORY_DEFS.map((row) => row.id));
    for (const id of DEMO_2025_CATEGORY_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("does not make Clair Obscur the Best Combat favorite", () => {
    expect(combatFavoriteKey()).toBe("hades-ii");
    expect(combatFavoriteKey()).not.toBe("clair-obscur");
  });

  it("looks up horror-only titles that are not in the GOTY 60", () => {
    const keys = uniqueTitlesForLookup().map((row) => row.key);
    expect(keys).toContain("dying-light-beast");
    expect(keys).toContain("little-nightmares-3");
    expect(keys).toContain("re-survival-unit");
  });

  it("does not put 2026 Resident Evil Requiem on the 2025 horror slate", () => {
    const horror = DEMO_2025_CATEGORIES.find(
      (cat) => cat.categoryId === "best-horror-game",
    );
    const residentEvil = horror?.picks.find(
      (pick) => pick.key === "re-survival-unit",
    );
    expect(residentEvil?.titles).toEqual(["Resident Evil Survival Unit"]);
    const titles = uniqueTitlesForLookup().flatMap((row) => row.titles);
    expect(titles.some((title) => /requiem/i.test(title))).toBe(false);
    expect(titles.some((title) => /resident evil 9/i.test(title))).toBe(false);
  });
});

describe("seed host display names", () => {
  it("marks hosts in the public display name", () => {
    expect(seedCommunityDisplayName(1, true)).toBe("Seed Host 001");
    expect(seedCommunityDisplayName(7, false)).toBe("Seed Member 007");
  });
});

describe("2025 demo sampling", () => {
  const pool = DEMO_2025_GOTY.map((row, i) => ({
    key: row.key,
    gameId: `g-${row.key}`,
    weight: row.weight,
    tags: row.tags,
  }));

  it("samples GOTY without replacement", () => {
    const ids = pickDemoGotyList(pool, "mainstream", rngForVoter(3));
    expect(ids).toHaveLength(DEMO_2025_LIST_SIZE);
    expect(new Set(ids).size).toBe(DEMO_2025_LIST_SIZE);
  });

  it("cycles taste profiles across voters", () => {
    expect(tasteForIndex(1)).toBe("mainstream");
    expect(tasteForIndex(2)).toBe("indie");
    expect(tasteForIndex(11)).toBe("mainstream");
  });

  it("lets action voters diverge from narrative voters", () => {
    const narrative = pickDemoGotyList(pool, "narrative", mulberry32(11));
    const action = pickDemoGotyList(pool, "action", mulberry32(11));
    expect(narrative).not.toEqual(action);
  });

  it("settles a large community around Clair Obscur without hard-coding rank 1", () => {
    const firsts = new Map<string, number>();
    const uniques = new Set<string>();
    for (let i = 1; i <= 150; i += 1) {
      const list = pickDemoGotyList(pool, tasteForIndex(i), rngForVoter(i));
      for (const id of list) uniques.add(id);
      const top = list[0];
      if (top) firsts.set(top, (firsts.get(top) ?? 0) + 1);
    }
    expect(uniques.size).toBeGreaterThanOrEqual(50);
    const ranked = [...firsts.entries()].sort((a, b) => b[1] - a[1]);
    expect(ranked[0]?.[0]).toBe("g-clair-obscur");
    expect(ranked[0]?.[1]).toBeGreaterThan(ranked[1]?.[1] ?? 0);
  });

  it("makes Best Combat a Hades / Monster Hunter / Doom fight, not Clair Obscur", () => {
    const combatDefs = [
      { key: "hades-ii", weight: 100, tags: ["action", "indie"] as const },
      { key: "mh-wilds", weight: 88, tags: ["rpg", "action"] as const },
      { key: "doom-dark-ages", weight: 82, tags: ["action"] as const },
      { key: "silksong", weight: 74, tags: ["indie", "action"] as const },
      { key: "clair-obscur", weight: 18, tags: ["rpg"] as const },
    ];
    const combatPool = combatDefs.map((row) => ({
      ...row,
      gameId: `g-${row.key}`,
    }));
    const counts = new Map<string, number>();
    for (let i = 1; i <= 150; i += 1) {
      const id = pickDemoCategoryVote(
        combatPool,
        tasteForIndex(i),
        rngForVoter(i + 90),
      );
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    expect(ranked[0]?.[0]).not.toBe("g-clair-obscur");
    expect(
      ["g-hades-ii", "g-mh-wilds", "g-doom-dark-ages", "g-silksong"].includes(
        ranked[0]?.[0] ?? "",
      ),
    ).toBe(true);
    expect(counts.get("g-clair-obscur") ?? 0).toBeLessThan(
      counts.get(ranked[0]![0]) ?? 0,
    );
  });

  it("votes every demo award and skips empty pools", () => {
    const pools = [
      ...fakeDemoCategoryPools(),
      { categoryId: "empty", games: [] },
    ];
    const votes = buildDemo2025CategoryVotes(
      pools,
      tasteForIndex(1),
      rngForVoter(1),
    );
    expect(votes.map((vote) => vote.categoryId)).toEqual([
      ...DEMO_2025_CATEGORY_IDS,
    ]);
  });

  it("does not crown Clair Obscur in Best Combat across many voters", () => {
    const pools = fakeDemoCategoryPools();
    const counts = new Map<string, number>();
    for (let i = 1; i <= 150; i += 1) {
      const votes = buildDemo2025CategoryVotes(
        pools,
        tasteForIndex(i),
        rngForVoter(i + 90),
      );
      const combat = votes.find((vote) => vote.categoryId === "best-combat");
      if (combat) {
        counts.set(combat.gameId, (counts.get(combat.gameId) ?? 0) + 1);
      }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    expect(ranked[0]?.[0]).not.toBe("g-clair-obscur");
  });

  it("keeps only active demo awards that have catalog matches", () => {
    const filtered = demo2025CategoriesForActiveAwards(
      {
        goty: [],
        unmatched: [],
        categories: [
          {
            categoryId: "best-combat",
            games: [
              {
                key: "hades-ii",
                gameId: "g1",
                weight: 100,
                tags: ["action"],
              },
            ],
          },
          { categoryId: "narrative", games: [] },
          {
            categoryId: "indie",
            games: [
              {
                key: "silksong",
                gameId: "g2",
                weight: 80,
                tags: ["indie"],
              },
            ],
          },
        ],
      },
      new Set(["best-combat", "narrative"]),
    );
    expect(filtered.map((cat) => cat.categoryId)).toEqual(["best-combat"]);
  });

  it("uses injected rng for weighted sample", () => {
    const items = [
      { id: "a", w: 100 },
      { id: "b", w: 1 },
    ];
    const first = weightedSampleWithRng(items, 1, (x) => x.w, mulberry32(1));
    const second = weightedSampleWithRng(items, 1, (x) => x.w, mulberry32(1));
    expect(first).toEqual(second);
  });
});
