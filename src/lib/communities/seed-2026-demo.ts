/**
 * 2026 site standings category seed: per-award weighted pools.
 * GOTY lists still use the critic-count year pool.
 */

import {
  DEMO_2025_CATEGORY_IDS,
  type DemoCategoryPickDef,
  type DemoTasteTag,
  type DemoTitleDef,
} from "./seed-2025-demo";

export const DEMO_2026_YEAR = 2026;
export const DEMO_2026_CATEGORY_IDS = DEMO_2025_CATEGORY_IDS;

function title(
  key: string,
  weight: number,
  titles: string[],
  tags: DemoTasteTag[],
): DemoTitleDef {
  return { key, weight, titles, tags };
}

/** Title aliases + taste tags. Category weights live on DEMO_2026_CATEGORIES. */
export const DEMO_2026_TITLES: readonly DemoTitleDef[] = [
  title("re-requiem", 100, ["Resident Evil Requiem", "Resident Evil 9"], ["horror", "narrative", "action", "japanese", "mainstream"]),
  title("dawnwalker", 88, ["The Blood of Dawnwalker", "Blood of Dawnwalker"], ["rpg", "narrative", "horror", "mainstream"]),
  title("007-first-light", 72, ["007 First Light", "007: First Light"], ["mainstream", "action", "narrative"]),
  title("mixtape", 50, ["Mixtape"], ["indie", "narrative"]),
  title("cairn", 44, ["Cairn"], ["indie", "narrative"]),
  title("plague-tale-legacy", 36, ["Resonance: A Plague Tale Legacy", "Resonance A Plague Tale Legacy"], ["narrative", "horror"]),
  title("pragmata", 28, ["Pragmata"], ["action", "japanese", "narrative"]),
  title("mina-hollower", 22, ["Mina the Hollower"], ["indie", "action"]),
  title("wolverine", 16, ["Marvel's Wolverine", "Marvel’s Wolverine", "Wolverine"], ["mainstream", "action"]),
  title("gothic-remake", 10, ["Gothic 1 Remake", "Gothic Remake"], ["rpg", "narrative"]),
  title("orbitals", 100, ["Orbitals"], ["indie", "nintendo", "multiplayer"]),
  title("reanimal", 48, ["Reanimal"], ["horror", "indie"]),
  title("onimusha-wots", 40, ["Onimusha: Way of the Sword", "Onimusha Way of the Sword"], ["action", "japanese"]),
  title("pokopia", 32, ["Pokémon Pokopia", "Pokemon Pokopia"], ["nintendo", "mainstream"]),
  title("forza-6", 28, ["Forza Horizon 6"], ["mainstream", "multiplayer"]),
  title("crimson-desert", 72, ["Crimson Desert"], ["rpg", "action", "mainstream"]),
  title("code-vein-ii", 52, ["Code Vein II", "Code Vein 2"], ["rpg", "action", "japanese"]),
  title("mh-stories-3", 42, ["Monster Hunter Stories 3: Twisted Reflection", "Monster Hunter Stories 3"], ["rpg", "nintendo", "japanese"]),
  title("mewgenics", 32, ["Mewgenics"], ["indie", "rpg"]),
  title("moonlighter-2", 22, ["Moonlighter 2: The Endless Vault", "Moonlighter 2"], ["indie", "rpg"]),
  title("nioh-3", 18, ["Nioh 3"], ["action", "japanese"]),
  title("trails-beyond-horizon", 14, ["The Legend of Heroes: Trails beyond the Horizon", "Trails beyond the Horizon", "Trails Beyond the Horizon"], ["rpg", "japanese"]),
  title("dq-vii-reimagined", 8, ["Dragon Quest VII Reimagined", "Dragon Quest 7 Reimagined", "Dragon Quest VII: Reimagined"], ["rpg", "japanese", "nintendo"]),
  title("saros", 56, ["Saros"], ["action", "mainstream"]),
  title("big-walk", 76, ["Big Walk"], ["indie", "multiplayer"]),
  title("valheim", 70, ["Valheim"], ["indie", "multiplayer"]),
  title("marvel-tokon", 40, ["Marvel Tokon: Fighting Souls", "Marvel Tōkon: Fighting Souls", "Marvel Tokon Fighting Souls"], ["multiplayer", "action"]),
  title("marathon", 32, ["Marathon"], ["multiplayer", "action"]),
  title("halloween-the-game", 24, ["Halloween: The Game", "Halloween The Game"], ["horror", "multiplayer"]),
  title("halo-campaign-evolved", 8, ["Halo: Campaign Evolved", "Halo Campaign Evolved"], ["multiplayer", "action", "mainstream"]),
  title("slay-the-spire-2", 84, ["Slay the Spire 2", "Slay the Spire II"], ["indie"]),
  title("he-who-watches", 16, ["He Who Watches"], ["indie"]),
  title("lego-batman", 86, ["LEGO Batman: Legacy of the Dark Knight", "Lego Batman: Legacy of the Dark Knight", "LEGO Batman Legacy of the Dark Knight"], ["nintendo", "mainstream"]),
  title("yoshi-mysterious-book", 48, ["Yoshi and the Mysterious Book"], ["nintendo"]),
  title("mario-tennis-fever", 36, ["Mario Tennis Fever"], ["nintendo", "multiplayer"]),
  title("pathologic-3", 44, ["Pathologic 3"], ["horror", "narrative"]),
  title("cthulhu-cosmic-abyss", 16, ["Cthulhu: The Cosmic Abyss", "Cthulhu The Cosmic Abyss"], ["horror"]),
  title("fatal-frame-2-remake", 8, ["Fatal Frame II: Crimson Butterfly Remake", "Fatal Frame 2: Crimson Butterfly Remake", "Fatal Frame 2 Remake"], ["horror", "japanese"]),
];

const TITLES_BY_KEY = new Map(DEMO_2026_TITLES.map((row) => [row.key, row]));

export const DEMO_2026_CATEGORIES: ReadonlyArray<{
  categoryId: (typeof DEMO_2026_CATEGORY_IDS)[number];
  picks: readonly DemoCategoryPickDef[];
}> = [
  {
    categoryId: "narrative",
    picks: [
      { key: "re-requiem", weight: 100 },
      { key: "dawnwalker", weight: 88 },
      { key: "007-first-light", weight: 72 },
      { key: "mixtape", weight: 50 },
      { key: "cairn", weight: 44 },
      { key: "plague-tale-legacy", weight: 36 },
      { key: "pragmata", weight: 28 },
      { key: "mina-hollower", weight: 22 },
      { key: "wolverine", weight: 16 },
      { key: "gothic-remake", weight: 10 },
    ],
  },
  {
    categoryId: "art-direction",
    picks: [
      { key: "orbitals", weight: 100 },
      { key: "cairn", weight: 90 },
      { key: "dawnwalker", weight: 78 },
      { key: "mina-hollower", weight: 70 },
      { key: "pragmata", weight: 62 },
      { key: "re-requiem", weight: 54 },
      { key: "reanimal", weight: 48 },
      { key: "onimusha-wots", weight: 40 },
      { key: "pokopia", weight: 32 },
      { key: "wolverine", weight: 12 },
    ],
  },
  {
    categoryId: "soundtrack",
    picks: [
      { key: "mixtape", weight: 100 },
      { key: "cairn", weight: 82 },
      { key: "orbitals", weight: 74 },
      { key: "dawnwalker", weight: 58 },
      { key: "re-requiem", weight: 50 },
      { key: "plague-tale-legacy", weight: 42 },
      { key: "pokopia", weight: 36 },
      { key: "forza-6", weight: 28 },
      { key: "mina-hollower", weight: 22 },
      { key: "pragmata", weight: 16 },
    ],
  },
  {
    categoryId: "best-rpg",
    picks: [
      { key: "dawnwalker", weight: 100 },
      { key: "crimson-desert", weight: 72 },
      { key: "code-vein-ii", weight: 52 },
      { key: "mh-stories-3", weight: 42 },
      { key: "mewgenics", weight: 32 },
      { key: "moonlighter-2", weight: 22 },
      { key: "nioh-3", weight: 18 },
      { key: "trails-beyond-horizon", weight: 14 },
      { key: "gothic-remake", weight: 10 },
      { key: "dq-vii-reimagined", weight: 8 },
    ],
  },
  {
    categoryId: "best-action-game",
    picks: [
      { key: "007-first-light", weight: 100 },
      { key: "nioh-3", weight: 82 },
      { key: "onimusha-wots", weight: 74 },
      { key: "pragmata", weight: 66 },
      { key: "saros", weight: 56 },
      { key: "dawnwalker", weight: 40 },
      { key: "mina-hollower", weight: 32 },
      { key: "crimson-desert", weight: 26 },
      { key: "re-requiem", weight: 22 },
      { key: "wolverine", weight: 14 },
    ],
  },
  {
    categoryId: "best-multiplayer",
    picks: [
      { key: "big-walk", weight: 100 },
      { key: "orbitals", weight: 88 },
      { key: "valheim", weight: 70 },
      { key: "forza-6", weight: 52 },
      { key: "marvel-tokon", weight: 40 },
      { key: "marathon", weight: 32 },
      { key: "halloween-the-game", weight: 22 },
      { key: "halo-campaign-evolved", weight: 8 },
    ],
  },
  {
    categoryId: "indie",
    picks: [
      { key: "cairn", weight: 100 },
      { key: "mina-hollower", weight: 94 },
      { key: "slay-the-spire-2", weight: 84 },
      { key: "big-walk", weight: 76 },
      { key: "orbitals", weight: 64, tags: ["indie"] },
      { key: "mixtape", weight: 52 },
      { key: "mewgenics", weight: 40 },
      { key: "moonlighter-2", weight: 32 },
      { key: "reanimal", weight: 24 },
      { key: "he-who-watches", weight: 16 },
    ],
  },
  {
    categoryId: "best-family-game",
    picks: [
      { key: "pokopia", weight: 100 },
      { key: "lego-batman", weight: 86 },
      { key: "orbitals", weight: 70 },
      { key: "yoshi-mysterious-book", weight: 48 },
      { key: "mario-tennis-fever", weight: 36 },
      { key: "big-walk", weight: 24 },
      { key: "forza-6", weight: 14 },
    ],
  },
  {
    categoryId: "best-horror-game",
    picks: [
      { key: "re-requiem", weight: 100 },
      { key: "dawnwalker", weight: 68 },
      { key: "reanimal", weight: 56 },
      { key: "pathologic-3", weight: 44 },
      { key: "plague-tale-legacy", weight: 34 },
      { key: "halloween-the-game", weight: 24 },
      { key: "cthulhu-cosmic-abyss", weight: 16 },
      { key: "fatal-frame-2-remake", weight: 8 },
    ],
  },
  {
    categoryId: "best-combat",
    picks: [
      { key: "onimusha-wots", weight: 100 },
      { key: "nioh-3", weight: 92 },
      { key: "saros", weight: 68 },
      { key: "pragmata", weight: 56 },
      { key: "mina-hollower", weight: 48 },
      { key: "dawnwalker", weight: 40 },
      { key: "007-first-light", weight: 32 },
      { key: "code-vein-ii", weight: 24 },
      { key: "re-requiem", weight: 16 },
      { key: "wolverine", weight: 12 },
    ],
  },
];

export function resolveDemo2026TitleDef(
  pick: DemoCategoryPickDef,
): DemoTitleDef | null {
  if (pick.titles && pick.tags) {
    return {
      key: pick.key,
      weight: pick.weight,
      titles: pick.titles,
      tags: pick.tags,
    };
  }
  const base = TITLES_BY_KEY.get(pick.key);
  if (!base) return null;
  return {
    key: pick.key,
    weight: pick.weight,
    titles: base.titles,
    tags: pick.tags ?? base.tags,
  };
}

function favoriteKey(categoryId: (typeof DEMO_2026_CATEGORY_IDS)[number]): string {
  const cat = DEMO_2026_CATEGORIES.find((row) => row.categoryId === categoryId);
  const top = [...(cat?.picks ?? [])].sort((a, b) => b.weight - a.weight)[0];
  return top?.key ?? "";
}

export function combatFavoriteKey2026(): string {
  return favoriteKey("best-combat");
}

export function horrorFavoriteKey2026(): string {
  return favoriteKey("best-horror-game");
}

export function rpgFavoriteKey2026(): string {
  return favoriteKey("best-rpg");
}

export function indieFavoriteKey2026(): string {
  return favoriteKey("indie");
}

export function actionFavoriteKey2026(): string {
  return favoriteKey("best-action-game");
}

export function uniqueTitlesFor2026Lookup(): Array<{
  key: string;
  titles: string[];
  tags: DemoTasteTag[];
}> {
  const byKey = new Map<string, { titles: string[]; tags: DemoTasteTag[] }>();
  for (const row of DEMO_2026_TITLES) {
    byKey.set(row.key, { titles: row.titles, tags: [...row.tags] });
  }
  for (const cat of DEMO_2026_CATEGORIES) {
    for (const pick of cat.picks) {
      const def = resolveDemo2026TitleDef(pick);
      if (!def) continue;
      if (!byKey.has(def.key)) {
        byKey.set(def.key, { titles: def.titles, tags: [...def.tags] });
      }
    }
  }
  return [...byKey.entries()].map(([key, row]) => ({ key, ...row }));
}
