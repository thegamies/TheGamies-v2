import { TGA_2025_CATEGORIES } from "./category-seed";

export type TgaSeedNominee =
  | { type: "game"; titles: string[] }
  | { type: "other"; name: string };

/** Official The Game Awards 2025 nominees, keyed by category label. */
export const TGA_2025_NOMINEES: Record<string, TgaSeedNominee[]> = {
  "Game of the Year": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Donkey Kong Bananza"),
    game("Hades II", "Hades 2"),
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
    game("Kingdom Come: Deliverance 2", "Kingdom Come Deliverance II"),
  ],
  "Best Game Direction": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Ghost of Yotei"),
    game("Hades II", "Hades 2"),
    game("Split Fiction"),
  ],
  "Best Narrative": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Ghost of Yotei"),
    game("Silent Hill f", "Silent Hill F"),
    game("Kingdom Come: Deliverance 2", "Kingdom Come Deliverance II"),
  ],
  "Best Art Direction": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Ghost of Yotei"),
    game("Hades II", "Hades 2"),
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
  ],
  "Best Score and Music": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
    game("Hades II", "Hades 2"),
    game("Ghost of Yotei"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
  ],
  "Best Audio Design": [
    game("Battlefield 6"),
    game("Silent Hill f", "Silent Hill F"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Ghost of Yotei"),
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
  ],
  "Best Performance": [
    other("Jennifer English — Clair Obscur: Expedition 33"),
    other("Ben Starr — Clair Obscur: Expedition 33"),
    other("Charlie Cox — Clair Obscur: Expedition 33"),
    other("Erika Ishii — Ghost of Yotei"),
    other("Konatsu Kato — Silent Hill f"),
    other("Troy Baker — Indiana Jones and the Great Circle"),
  ],
  "Best Independent Game": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Absolum"),
    game("Ball x Pit", "Ball X Pit"),
    game("Hades II", "Hades 2"),
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
    game("Blue Prince"),
  ],
  "Best Multiplayer": [
    game("ARC Raiders", "Arc Raiders"),
    game("Battlefield 6"),
    game("Elden Ring Nightreign"),
    game("Peak"),
    game("Split Fiction"),
  ],
  "Best Mobile Game": [
    game("Umamusume: Pretty Derby", "Uma Musume Pretty Derby"),
    game("Destiny Rising"),
    game("Persona 5: The Phantom X", "Persona 5 The Phantom X"),
    game("Sonic Rumble"),
    game("Wuthering Waves"),
  ],
  "Best Ongoing Game": [
    game("No Man's Sky", "No Mans Sky"),
    game("Final Fantasy XIV", "Final Fantasy 14", "Final Fantasy XIV Online"),
    game("Fortnite"),
    game("Helldivers 2", "Helldivers II"),
    game("Marvel Rivals"),
  ],
  "Best Debut Indie Game": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Blue Prince"),
    game("Despelote"),
    game("Dispatch"),
    game("Megabonk"),
  ],
  "Best Action Game": [
    game("Hades II", "Hades 2"),
    game("Battlefield 6"),
    game("Doom: The Dark Ages", "DOOM: The Dark Ages"),
    game("Ninja Gaiden 4", "Ninja Gaiden IV"),
    game("Shinobi: Art of Vengeance"),
  ],
  "Best Action/Adventure Game": [
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
    game("Death Stranding 2: On the Beach", "Death Stranding 2"),
    game("Ghost of Yotei"),
    game("Indiana Jones and the Great Circle"),
    game("Split Fiction"),
  ],
  "Best RPG": [
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Avowed"),
    game("Kingdom Come: Deliverance 2", "Kingdom Come Deliverance II"),
    game("The Outer Worlds 2"),
    game("Monster Hunter Wilds"),
  ],
  "Best Fighting Game": [
    game("Fatal Fury: City of the Wolves"),
    game("2XKO"),
    game("Capcom Fighting Collection 2"),
    game(
      "Mortal Kombat: Legacy Kollection",
      "Mortal Kombat: Legacy Collection",
    ),
    game(
      "Virtua Fighter 5 R.E.V.O. World Stage",
      "Virtua Fighter 5 R.E.V.O.",
    ),
  ],
  "Best Family Game": [
    game("Donkey Kong Bananza"),
    game("LEGO Party!", "Lego Party"),
    game("LEGO Voyagers", "Lego Voyagers"),
    game("Mario Kart World"),
    game("Sonic Racing: CrossWorlds", "Sonic Racing CrossWorlds"),
    game("Split Fiction"),
  ],
  "Best Sim/Strategy Game": [
    game(
      "Final Fantasy Tactics: The Ivalice Chronicles",
      "FINAL FANTASY TACTICS - The Ivalice Chronicles",
    ),
    game("The Alters"),
    game("Jurassic World Evolution 3"),
    game("Sid Meier's Civilization VII", "Civilization 7", "Civilization VII"),
    game("Tempest Rising"),
    game("Two Point Museum"),
  ],
  "Best Sports/Racing Game": [
    game("Mario Kart World"),
    game("EA Sports FC 26", "FC 26"),
    game("F1 25"),
    game("Rematch"),
    game("Sonic Racing: CrossWorlds", "Sonic Racing CrossWorlds"),
  ],
  "Best Adaptation": [
    other("The Last of Us: Season 2"),
    other("A Minecraft Movie"),
    other("Devil May Cry"),
    other("Splinter Cell: Deathwatch"),
    other("Until Dawn"),
  ],
  "Most Anticipated Game": [
    game("Grand Theft Auto VI", "Grand Theft Auto 6", "GTA 6", "GTA VI"),
    game("007 First Light"),
    game("Marvel's Wolverine", "Marvels Wolverine"),
    game("Resident Evil Requiem"),
    game("The Witcher 4"),
  ],
  "Games for Impact": [
    game("South of Midnight"),
    game("Consume Me"),
    game("Despelote"),
    game("Lost Records: Bloom & Rage"),
    game("Wanderstop"),
  ],
  "Best Esports Game": [
    game("Counter-Strike 2", "Counter Strike 2"),
    game("Dota 2"),
    game("Mobile Legends: Bang Bang"),
    game("League of Legends"),
    game("VALORANT", "Valorant"),
  ],
  "Best Esports Athlete": [
    other("Chovy — League of Legends"),
    other("brawk — VALORANT"),
    other("fOrsakeN — VALORANT"),
    other("Kakeru — Street Fighter"),
    other("MenaRD — Street Fighter"),
    other("ZywOo — Counter-Strike 2"),
  ],
  "Best Esports Team": [
    other("Team Vitality — Counter-Strike 2"),
    other("Gen.G — League of Legends"),
    other("NRG — VALORANT"),
    other("Team Falcons — Dota 2"),
    other("Team Liquid PH — Mobile Legends: Bang Bang"),
  ],
  "Best Community Support": [
    game("Baldur's Gate 3", "Baldurs Gate 3"),
    game("Final Fantasy XIV", "Final Fantasy 14", "Final Fantasy XIV Online"),
    game("Fortnite"),
    game("Helldivers 2", "Helldivers II"),
    game("No Man's Sky", "No Mans Sky"),
  ],
  "Content Creator of the Year": [
    other("MoistCr1TiKaL"),
    other("Caedrel"),
    other("Kai Cenat"),
    other("Sakura Miko"),
    other("The Burnt Peanut"),
  ],
  "Innovation in Accessibility": [
    game("Doom: The Dark Ages", "DOOM: The Dark Ages"),
    game("Assassin's Creed Shadows"),
    game("Atomfall"),
    game("EA Sports FC 26", "FC 26"),
    game("South of Midnight"),
  ],
  "Best VR/AR Game": [
    game("The Midnight Walk"),
    game("Alien: Rogue Incursion"),
    game("Arken Age"),
    game("Ghost Town"),
    game("Marvel's Deadpool VR", "Deadpool VR"),
  ],
  "Players' Voice": [
    game("Wuthering Waves"),
    game("Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"),
    game("Dispatch"),
    game("Genshin Impact"),
    game("Hollow Knight: Silksong", "Hollow Knight Silksong"),
  ],
};

function game(...titles: string[]): TgaSeedNominee {
  return { type: "game", titles };
}

function other(name: string): TgaSeedNominee {
  return { type: "other", name };
}

export function normalizeNomineeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[:!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nomineeSearchTitles(nominee: Extract<TgaSeedNominee, { type: "game" }>) {
  return [...new Set(nominee.titles.map((title) => title.trim()).filter(Boolean))];
}

/** Every 2025 category in the seed has a nominee list. */
export function tga2025NomineeCoverage(): {
  missingCategories: string[];
  extraCategories: string[];
} {
  const labels = TGA_2025_CATEGORIES.map((row) => row.label);
  const missingCategories = labels.filter((label) => !TGA_2025_NOMINEES[label]?.length);
  const extraCategories = Object.keys(TGA_2025_NOMINEES).filter(
    (label) => !labels.includes(label),
  );
  return { missingCategories, extraCategories };
}
