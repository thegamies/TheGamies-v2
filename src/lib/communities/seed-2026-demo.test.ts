import { describe, expect, it } from "vitest";
import { AWARD_CATEGORY_DEFS } from "@/lib/live-aggregate/award-category-defs";
import {
  DEMO_2025_CATEGORY_IDS,
  pickDemoCategoryVote,
  rngForVoter,
  tasteForIndex,
} from "./seed-2025-demo";
import {
  DEMO_2026_CATEGORIES,
  DEMO_2026_CATEGORY_IDS,
  DEMO_2026_YEAR,
  actionFavoriteKey2026,
  combatFavoriteKey2026,
  horrorFavoriteKey2026,
  indieFavoriteKey2026,
  resolveDemo2026TitleDef,
  rpgFavoriteKey2026,
  uniqueTitlesFor2026Lookup,
} from "./seed-2026-demo";

const BLOCKED_TITLE =
  /control resonant|silent hill:? townfall|fortune.?s weave|phantom blade|minecraft dungeons/i;

describe("2026 standings category seed data", () => {
  it("uses the same ten awards as 2025", () => {
    expect(DEMO_2026_CATEGORY_IDS).toEqual(DEMO_2025_CATEGORY_IDS);
    expect(DEMO_2026_CATEGORIES.map((cat) => cat.categoryId)).toEqual([
      ...DEMO_2026_CATEGORY_IDS,
    ]);
  });

  it("maps every 2026 award onto a site catalog id", () => {
    const ids = new Set(AWARD_CATEGORY_DEFS.map((row) => row.id));
    for (const id of DEMO_2026_CATEGORY_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("resolves every category pick against the title registry", () => {
    for (const cat of DEMO_2026_CATEGORIES) {
      for (const pick of cat.picks) {
        expect(resolveDemo2026TitleDef(pick)?.titles.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps Onimusha as Best Combat favorite, not Requiem", () => {
    expect(combatFavoriteKey2026()).toBe("onimusha-wots");
    expect(combatFavoriteKey2026()).not.toBe("re-requiem");
  });

  it("locks horror on Requiem and RPG on Dawnwalker", () => {
    expect(horrorFavoriteKey2026()).toBe("re-requiem");
    expect(rpgFavoriteKey2026()).toBe("dawnwalker");
  });

  it("makes Cairn the indie favorite and 007 the action favorite", () => {
    expect(indieFavoriteKey2026()).toBe("cairn");
    expect(actionFavoriteKey2026()).toBe("007-first-light");
  });

  it("includes LEGO Batman on the family slate", () => {
    const family = DEMO_2026_CATEGORIES.find(
      (cat) => cat.categoryId === "best-family-game",
    );
    expect(family?.picks.some((pick) => pick.key === "lego-batman")).toBe(true);
    expect(family?.picks[0]?.key).toBe("pokopia");
    expect(family?.picks[1]?.key).toBe("lego-batman");
  });

  it("looks up Dawnwalker, Cairn, and Pathologic 3", () => {
    const keys = uniqueTitlesFor2026Lookup().map((row) => row.key);
    expect(keys).toContain("dawnwalker");
    expect(keys).toContain("cairn");
    expect(keys).toContain("lego-batman");
    expect(keys).toContain("pathologic-3");
  });

  it("omits titles that were not out on 2026-09-15", () => {
    const titles = uniqueTitlesFor2026Lookup().flatMap((row) => row.titles);
    expect(titles.some((title) => BLOCKED_TITLE.test(title))).toBe(false);
    const keys = uniqueTitlesFor2026Lookup().map((row) => row.key);
    expect(keys).not.toContain("control-resonant");
    expect(keys).not.toContain("townfall");
    expect(keys).not.toContain("fe-fortunes-weave");
    expect(keys).not.toContain("phantom-blade-zero");
    expect(keys).not.toContain("minecraft-dungeons-2");
  });

  it("keeps Wolverine as a long-tail pick, not a category favorite", () => {
    expect(actionFavoriteKey2026()).not.toBe("wolverine");
    expect(combatFavoriteKey2026()).not.toBe("wolverine");
    const action = DEMO_2026_CATEGORIES.find(
      (cat) => cat.categoryId === "best-action-game",
    );
    const wolverine = action?.picks.find((pick) => pick.key === "wolverine");
    expect(wolverine?.weight).toBeLessThan(20);
  });

  it("does not reuse the 2025 voter rng stream", () => {
    expect(rngForVoter(1, DEMO_2026_YEAR)()).not.toBe(rngForVoter(1)());
  });

  it("does not let Orbitals take Best Indie from higher-weighted games", () => {
    const indie = DEMO_2026_CATEGORIES.find(
      (cat) => cat.categoryId === "indie",
    )!;
    const pool = indie.picks.flatMap((pick) => {
      const def = resolveDemo2026TitleDef(pick);
      if (!def) return [];
      return [
        {
          key: pick.key,
          gameId: pick.key,
          weight: pick.weight,
          tags: def.tags,
        },
      ];
    });
    const counts = new Map<string, number>();
    for (let i = 1; i <= 150; i += 1) {
      const id = pickDemoCategoryVote(
        pool,
        tasteForIndex(i),
        rngForVoter(i, DEMO_2026_YEAR),
      );
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    expect(ranked[0]?.[0]).not.toBe("orbitals");
    expect(counts.get("orbitals") ?? 0).toBeLessThan(counts.get("cairn") ?? 0);
  });
});
