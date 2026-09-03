/**
 * 2025 reception demo: simulate individual seed voters from weighted pools.
 * Do not manufacture standings — ballots go through live_goty_contrib.
 */

export const DEMO_2025_YEAR = 2025;
export const DEMO_2025_LIST_SIZE = 10;
export const DEMO_2025_MIN_GOTY_GAMES = 50;

export const DEMO_2025_CATEGORY_IDS = [
  "narrative",
  "art-direction",
  "soundtrack",
  "best-rpg",
  "best-action-game",
  "best-multiplayer",
  "indie",
  "best-family-game",
  "best-horror-game",
  "best-combat",
] as const;

export type DemoTasteProfile =
  | "mainstream"
  | "indie"
  | "rpg"
  | "nintendo"
  | "action"
  | "multiplayer"
  | "narrative"
  | "horror"
  | "japanese"
  | "eclectic";

export type DemoTasteTag = Exclude<DemoTasteProfile, "eclectic">;

export const DEMO_2025_TASTES: readonly DemoTasteProfile[] = [
  "mainstream",
  "indie",
  "rpg",
  "nintendo",
  "action",
  "multiplayer",
  "narrative",
  "horror",
  "japanese",
  "eclectic",
];

export type DemoTitleDef = {
  key: string;
  weight: number;
  titles: string[];
  tags: DemoTasteTag[];
};

export type DemoCategoryPickDef = {
  key: string;
  weight: number;
  titles?: string[];
  tags?: DemoTasteTag[];
};

function title(
  key: string,
  weight: number,
  titles: string[],
  tags: DemoTasteTag[],
): DemoTitleDef {
  return { key, weight, titles, tags };
}

/** Sampling weights — do not normalize to 100. */
export const DEMO_2025_GOTY: readonly DemoTitleDef[] = [
  title("clair-obscur", 100, ["Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"], ["mainstream", "rpg", "narrative", "indie"]),
  title("hades-ii", 73, ["Hades II", "Hades 2"], ["mainstream", "indie", "action"]),
  title("silksong", 70, ["Hollow Knight: Silksong", "Hollow Knight Silksong"], ["mainstream", "indie", "action"]),
  title("kcd-ii", 64, ["Kingdom Come: Deliverance II", "Kingdom Come: Deliverance 2", "Kingdom Come Deliverance II"], ["mainstream", "rpg", "narrative"]),
  title("death-stranding-2", 58, ["Death Stranding 2: On the Beach", "Death Stranding 2"], ["mainstream", "narrative"]),
  title("ghost-of-yotei", 55, ["Ghost of Yōtei", "Ghost of Yotei"], ["mainstream", "action", "narrative"]),
  title("dk-bananza", 49, ["Donkey Kong Bananza"], ["mainstream", "nintendo"]),
  title("arc-raiders", 46, ["ARC Raiders", "Arc Raiders"], ["mainstream", "multiplayer", "action"]),
  title("split-fiction", 44, ["Split Fiction"], ["mainstream", "multiplayer"]),
  title("blue-prince", 39, ["Blue Prince"], ["indie", "narrative"]),
  title("battlefield-6", 36, ["Battlefield 6"], ["mainstream", "multiplayer", "action"]),
  title("silent-hill-f", 35, ["Silent Hill f", "Silent Hill F"], ["horror", "narrative", "japanese"]),
  title("doom-dark-ages", 34, ["Doom: The Dark Ages", "DOOM: The Dark Ages"], ["mainstream", "action"]),
  title("mh-wilds", 32, ["Monster Hunter Wilds"], ["mainstream", "rpg", "action", "multiplayer"]),
  title("mario-kart-world", 30, ["Mario Kart World"], ["nintendo", "multiplayer"]),
  title("outer-worlds-2", 29, ["The Outer Worlds 2"], ["rpg"]),
  title("avowed", 27, ["Avowed"], ["rpg"]),
  title("nightreign", 26, ["Elden Ring Nightreign"], ["action", "multiplayer", "rpg"]),
  title("dispatch", 25, ["Dispatch"], ["indie", "narrative"]),
  title("ball-x-pit", 24, ["Ball x Pit", "Ball X Pit"], ["indie"]),
  title("the-alters", 23, ["The Alters"], ["narrative", "indie"]),
  title("ac-shadows", 22, ["Assassin's Creed Shadows", "Assassins Creed Shadows"], ["mainstream", "action"]),
  title("borderlands-4", 21, ["Borderlands 4"], ["action", "multiplayer"]),
  title("pokemon-za", 20, ["Pokémon Legends: Z-A", "Pokemon Legends Z-A", "Pokémon Legends Z-A"], ["nintendo", "rpg", "japanese"]),
  title("peak", 20, ["Peak"], ["multiplayer", "indie"]),
  title("south-of-midnight", 19, ["South of Midnight"], ["narrative"]),
  title("indiana-jones", 18, ["Indiana Jones and the Great Circle"], ["narrative", "action"]),
  title("mgs-delta", 18, ["Metal Gear Solid Delta: Snake Eater", "Metal Gear Solid Δ: Snake Eater", "Metal Gear Solid Delta"], ["action", "japanese"]),
  title("fft-ivalice", 17, ["Final Fantasy Tactics: The Ivalice Chronicles", "Final Fantasy Tactics Ivalice Chronicles"], ["rpg", "japanese"]),
  title("shinobi", 16, ["Shinobi: Art of Vengeance"], ["action", "japanese"]),
  title("citizen-sleeper-2", 16, ["Citizen Sleeper 2", "Citizen Sleeper 2: Starward Vector"], ["indie", "narrative", "rpg"]),
  title("cronos", 15, ["Cronos: The New Dawn"], ["horror"]),
  title("pirate-yakuza", 15, ["Like a Dragon: Pirate Yakuza in Hawaii", "Like a Dragon Pirate Yakuza in Hawaii"], ["japanese", "rpg"]),
  title("deltarune-34", 14, ["Deltarune Chapters 3+4", "Deltarune", "DELTARUNE"], ["indie", "narrative"]),
  title("trails-sky-1st", 14, ["Trails in the Sky 1st Chapter", "The Legend of Heroes: Trails in the Sky 1st Chapter"], ["rpg", "japanese"]),
  title("digimon-time-stranger", 13, ["Digimon Story Time Stranger", "Digimon Story: Time Stranger"], ["rpg", "japanese"]),
  title("oblivion-remastered", 13, ["The Elder Scrolls IV: Oblivion Remastered", "Oblivion Remastered"], ["rpg"]),
  title("xenoblade-x-de", 12, ["Xenoblade Chronicles X Definitive Edition", "Xenoblade Chronicles X: Definitive Edition", "Xenoblade Chronicles X DE"], ["nintendo", "rpg", "japanese"]),
  title("dq-1-2", 12, ["Dragon Quest I & II HD-2D Remake", "Dragon Quest I & II HD-2D", "Dragon Quest I-II HD-2D Remake"], ["rpg", "japanese", "nintendo"]),
  title("two-point-museum", 11, ["Two Point Museum"], ["indie"]),
  title("civ-vii", 11, ["Civilization VII", "Sid Meier's Civilization VII", "Civilization 7"], ["mainstream"]),
  title("rematch", 11, ["Rematch"], ["multiplayer"]),
  title("sonic-crossworlds", 10, ["Sonic Racing: CrossWorlds", "Sonic Racing CrossWorlds"], ["nintendo", "multiplayer"]),
  title("fatal-fury", 10, ["Fatal Fury: City of the Wolves"], ["action", "japanese"]),
  title("ninja-gaiden-4", 10, ["Ninja Gaiden 4", "Ninja Gaiden IV"], ["action", "japanese"]),
  title("atomfall", 9, ["Atomfall"], ["action"]),
  title("lost-records", 9, ["Lost Records: Bloom & Rage", "Lost Records Bloom & Rage"], ["narrative"]),
  title("wanderstop", 9, ["Wanderstop"], ["indie", "narrative"]),
  title("despelote", 8, ["Despelote"], ["indie", "narrative"]),
  title("consume-me", 8, ["Consume Me"], ["indie"]),
  title("absolum", 8, ["Absolum"], ["indie", "action"]),
  title("tempest-rising", 7, ["Tempest Rising"], ["action"]),
  title("jw-evolution-3", 7, ["Jurassic World Evolution 3"], []),
  title("f1-25", 7, ["F1 25", "EA Sports F1 25"], ["multiplayer"]),
  title("fc-26", 6, ["EA Sports FC 26", "FC 26"], ["multiplayer"]),
  title("lego-voyagers", 6, ["LEGO Voyagers", "Lego Voyagers"], ["nintendo"]),
  title("lego-party", 5, ["LEGO Party!", "Lego Party"], ["nintendo", "multiplayer"]),
  title("2xko", 5, ["2XKO"], ["multiplayer", "action"]),
  title("midnight-walk", 5, ["The Midnight Walk"], ["horror", "indie"]),
  title("umamusume", 4, ["Umamusume: Pretty Derby", "Uma Musume Pretty Derby"], ["japanese"]),
];

const GOTY_BY_KEY = new Map(DEMO_2025_GOTY.map((row) => [row.key, row]));

export const DEMO_2025_CATEGORIES: ReadonlyArray<{
  categoryId: (typeof DEMO_2025_CATEGORY_IDS)[number];
  picks: readonly DemoCategoryPickDef[];
}> = [
  {
    categoryId: "narrative",
    picks: [
      { key: "clair-obscur", weight: 100 },
      { key: "kcd-ii", weight: 65 },
      { key: "silent-hill-f", weight: 55 },
      { key: "death-stranding-2", weight: 52 },
      { key: "ghost-of-yotei", weight: 47 },
      { key: "dispatch", weight: 38 },
      { key: "south-of-midnight", weight: 25 },
      { key: "lost-records", weight: 18 },
      { key: "citizen-sleeper-2", weight: 17 },
      { key: "despelote", weight: 10 },
    ],
  },
  {
    categoryId: "art-direction",
    picks: [
      { key: "clair-obscur", weight: 100 },
      { key: "hades-ii", weight: 75 },
      { key: "silksong", weight: 68 },
      { key: "death-stranding-2", weight: 54 },
      { key: "ghost-of-yotei", weight: 48 },
      { key: "blue-prince", weight: 38 },
      { key: "silent-hill-f", weight: 27 },
      { key: "south-of-midnight", weight: 23 },
      { key: "midnight-walk", weight: 18 },
      { key: "dk-bananza", weight: 17 },
    ],
  },
  {
    categoryId: "soundtrack",
    picks: [
      { key: "clair-obscur", weight: 100 },
      { key: "silksong", weight: 76 },
      { key: "hades-ii", weight: 68 },
      { key: "death-stranding-2", weight: 48 },
      { key: "ghost-of-yotei", weight: 43 },
      { key: "silent-hill-f", weight: 27 },
      { key: "dk-bananza", weight: 20 },
      { key: "south-of-midnight", weight: 17 },
      { key: "shinobi", weight: 13 },
      { key: "deltarune-34", weight: 12 },
    ],
  },
  {
    categoryId: "best-rpg",
    picks: [
      { key: "clair-obscur", weight: 100 },
      { key: "kcd-ii", weight: 75 },
      { key: "mh-wilds", weight: 52 },
      { key: "outer-worlds-2", weight: 45 },
      { key: "avowed", weight: 42 },
      { key: "pokemon-za", weight: 25 },
      { key: "digimon-time-stranger", weight: 19 },
      { key: "trails-sky-1st", weight: 17 },
      { key: "dq-1-2", weight: 13 },
      { key: "oblivion-remastered", weight: 12 },
    ],
  },
  {
    categoryId: "best-action-game",
    picks: [
      { key: "doom-dark-ages", weight: 100 },
      { key: "hades-ii", weight: 82 },
      { key: "battlefield-6", weight: 57 },
      { key: "shinobi", weight: 44 },
      { key: "ninja-gaiden-4", weight: 40 },
      { key: "arc-raiders", weight: 34 },
      { key: "nightreign", weight: 32 },
      { key: "absolum", weight: 22 },
      { key: "mh-wilds", weight: 20 },
      { key: "borderlands-4", weight: 18 },
    ],
  },
  {
    categoryId: "best-multiplayer",
    picks: [
      { key: "arc-raiders", weight: 100 },
      { key: "split-fiction", weight: 76 },
      { key: "battlefield-6", weight: 63 },
      { key: "peak", weight: 52 },
      { key: "nightreign", weight: 47 },
      { key: "mario-kart-world", weight: 35 },
      { key: "rematch", weight: 28 },
      { key: "mh-wilds", weight: 25 },
      { key: "sonic-crossworlds", weight: 18 },
      { key: "2xko", weight: 13 },
    ],
  },
  {
    categoryId: "indie",
    picks: [
      { key: "hades-ii", weight: 100 },
      { key: "silksong", weight: 94 },
      { key: "clair-obscur", weight: 88 },
      { key: "blue-prince", weight: 65 },
      { key: "ball-x-pit", weight: 43 },
      { key: "absolum", weight: 32 },
      { key: "dispatch", weight: 29 },
      { key: "despelote", weight: 20 },
      { key: "consume-me", weight: 15 },
      { key: "wanderstop", weight: 14 },
    ],
  },
  {
    categoryId: "best-family-game",
    picks: [
      { key: "dk-bananza", weight: 100 },
      { key: "mario-kart-world", weight: 78 },
      { key: "split-fiction", weight: 52 },
      { key: "sonic-crossworlds", weight: 35 },
      { key: "lego-voyagers", weight: 23 },
      { key: "lego-party", weight: 17 },
      { key: "pokemon-za", weight: 15 },
    ],
  },
  {
    categoryId: "best-horror-game",
    picks: [
      { key: "silent-hill-f", weight: 100 },
      { key: "cronos", weight: 62 },
      { key: "midnight-walk", weight: 39 },
      {
        key: "dying-light-beast",
        weight: 36,
        titles: ["Dying Light: The Beast", "Dying Light The Beast"],
        tags: ["horror", "action"],
      },
      {
        key: "little-nightmares-3",
        weight: 31,
        titles: ["Little Nightmares III", "Little Nightmares 3"],
        tags: ["horror", "indie"],
      },
      {
        key: "re-2025",
        weight: 20,
        titles: [
          "Resident Evil Requiem",
          "Resident Evil 9",
          "Resident Evil Survival Unit",
        ],
        tags: ["horror"],
      },
      {
        key: "killing-floor-3",
        weight: 18,
        titles: ["Killing Floor 3"],
        tags: ["horror", "multiplayer", "action"],
      },
      {
        key: "directive-8020",
        weight: 15,
        titles: ["Directive 8020"],
        tags: ["horror"],
      },
      {
        key: "dead-take",
        weight: 12,
        titles: ["Dead Take"],
        tags: ["horror", "indie"],
      },
      {
        key: "fbc-firebreak",
        weight: 8,
        titles: ["FBC: Firebreak", "FBC Firebreak"],
        tags: ["horror", "multiplayer"],
      },
    ],
  },
  {
    categoryId: "best-combat",
    picks: [
      { key: "hades-ii", weight: 100 },
      { key: "mh-wilds", weight: 88 },
      { key: "doom-dark-ages", weight: 82 },
      { key: "silksong", weight: 74 },
      { key: "ghost-of-yotei", weight: 61 },
      { key: "nightreign", weight: 58 },
      { key: "ninja-gaiden-4", weight: 48 },
      { key: "shinobi", weight: 44 },
      { key: "kcd-ii", weight: 34 },
      { key: "arc-raiders", weight: 27 },
      { key: "fatal-fury", weight: 22 },
      { key: "clair-obscur", weight: 18 },
    ],
  },
];

export function seedCommunityDisplayName(index: number, isHost: boolean): string {
  const n = String(index).padStart(3, "0");
  return isHost ? `Seed Host ${n}` : `Seed Member ${n}`;
}

export function tasteForIndex(index: number): DemoTasteProfile {
  return DEMO_2025_TASTES[(Math.max(1, index) - 1) % DEMO_2025_TASTES.length]!;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngForVoter(index: number): () => number {
  return mulberry32(index * 9973 + 2025);
}

export function tasteAffinity(
  taste: DemoTasteProfile,
  tags: readonly DemoTasteTag[],
  baseWeight: number,
): number {
  if (taste === "eclectic") return 1;
  if (tags.includes(taste)) return 1.7;
  if (taste === "mainstream") {
    return baseWeight >= 40 ? 1.35 : 0.72;
  }
  if (taste === "horror") return 0.55;
  if (taste === "nintendo") return 0.68;
  if (taste === "multiplayer") return 0.7;
  if (taste === "action") return 0.75;
  if (taste === "rpg") return 0.72;
  if (taste === "indie") return 0.7;
  if (taste === "narrative") return 0.8;
  if (taste === "japanese") return 0.8;
  return 0.85;
}

export function effectiveWeight(
  baseWeight: number,
  taste: DemoTasteProfile,
  tags: readonly DemoTasteTag[],
  rng: () => number,
): number {
  const noise = 0.75 + rng() * 0.5;
  return Math.max(1e-6, baseWeight * tasteAffinity(taste, tags, baseWeight) * noise);
}

export function weightedSampleWithRng<T>(
  items: T[],
  k: number,
  weightOf: (item: T) => number,
  rng: () => number,
): T[] {
  if (k <= 0 || items.length === 0) return [];
  if (k >= items.length) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    return copy;
  }

  const keyed = items.map((item) => {
    const w = Math.max(weightOf(item), 1e-9);
    const u = Math.max(rng(), 1e-12);
    return { item, key: u ** (1 / w) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, k).map((row) => row.item);
}

export type DemoPickable = {
  key: string;
  gameId: string;
  weight: number;
  tags: readonly DemoTasteTag[];
};

export function pickDemoGotyList(
  pool: DemoPickable[],
  taste: DemoTasteProfile,
  rng: () => number,
  listSize = DEMO_2025_LIST_SIZE,
): string[] {
  const sized = Math.min(listSize, pool.length);
  if (sized <= 0) return [];
  const selected = weightedSampleWithRng(
    pool,
    sized,
    (row) => effectiveWeight(row.weight, taste, row.tags, rng),
    rng,
  );
  const scored = selected.map((row) => ({
    gameId: row.gameId,
    score: effectiveWeight(row.weight, taste, row.tags, rng),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((row) => row.gameId);
}

export function pickDemoCategoryVote(
  pool: DemoPickable[],
  taste: DemoTasteProfile,
  rng: () => number,
): string | null {
  if (pool.length === 0) return null;
  const [choice] = weightedSampleWithRng(
    pool,
    1,
    (row) => effectiveWeight(row.weight, taste, row.tags, rng),
    rng,
  );
  return choice?.gameId ?? null;
}

export function resolveTitleDef(pick: DemoCategoryPickDef): DemoTitleDef | null {
  if (pick.titles && pick.tags) {
    return {
      key: pick.key,
      weight: pick.weight,
      titles: pick.titles,
      tags: pick.tags,
    };
  }
  const base = GOTY_BY_KEY.get(pick.key);
  if (!base) return null;
  return {
    key: pick.key,
    weight: pick.weight,
    titles: base.titles,
    tags: pick.tags ?? base.tags,
  };
}

export function combatFavoriteKey(): string {
  const combat = DEMO_2025_CATEGORIES.find((c) => c.categoryId === "best-combat");
  const top = [...(combat?.picks ?? [])].sort((a, b) => b.weight - a.weight)[0];
  return top?.key ?? "";
}

export function uniqueTitlesForLookup(): Array<{
  key: string;
  titles: string[];
  tags: DemoTasteTag[];
}> {
  const byKey = new Map<string, { titles: string[]; tags: DemoTasteTag[] }>();
  for (const row of DEMO_2025_GOTY) {
    byKey.set(row.key, { titles: row.titles, tags: [...row.tags] });
  }
  for (const cat of DEMO_2025_CATEGORIES) {
    for (const pick of cat.picks) {
      const def = resolveTitleDef(pick);
      if (!def) continue;
      if (!byKey.has(def.key)) {
        byKey.set(def.key, { titles: def.titles, tags: [...def.tags] });
      }
    }
  }
  return [...byKey.entries()].map(([key, row]) => ({ key, ...row }));
}
