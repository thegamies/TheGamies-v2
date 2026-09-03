import { TGA_2025_CATEGORIES } from "./category-seed";
import { normalizeNomineeTitle } from "./nominee-seed";

/** Official The Game Awards 2025 winners, keyed by category label. */
export const TGA_2025_WINNERS: Record<string, string[]> = {
  "Game of the Year": ["Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"],
  "Best Game Direction": [
    "Clair Obscur: Expedition 33",
    "Clair Obscur Expedition 33",
  ],
  "Best Narrative": ["Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"],
  "Best Art Direction": [
    "Clair Obscur: Expedition 33",
    "Clair Obscur Expedition 33",
  ],
  "Best Score and Music": [
    "Clair Obscur: Expedition 33",
    "Clair Obscur Expedition 33",
  ],
  "Best Audio Design": ["Battlefield 6"],
  "Best Performance": [
    "Jennifer English — Clair Obscur: Expedition 33",
    "Jennifer English",
  ],
  "Best Independent Game": [
    "Clair Obscur: Expedition 33",
    "Clair Obscur Expedition 33",
  ],
  "Best Multiplayer": ["ARC Raiders", "Arc Raiders"],
  "Best Mobile Game": ["Umamusume: Pretty Derby", "Uma Musume Pretty Derby"],
  "Best Ongoing Game": ["No Man's Sky", "No Mans Sky"],
  "Best Debut Indie Game": [
    "Clair Obscur: Expedition 33",
    "Clair Obscur Expedition 33",
  ],
  "Best Action Game": ["Hades II", "Hades 2"],
  "Best Action/Adventure Game": [
    "Hollow Knight: Silksong",
    "Hollow Knight Silksong",
  ],
  "Best RPG": ["Clair Obscur: Expedition 33", "Clair Obscur Expedition 33"],
  "Best Fighting Game": ["Fatal Fury: City of the Wolves"],
  "Best Family Game": ["Donkey Kong Bananza"],
  "Best Sim/Strategy Game": [
    "Final Fantasy Tactics: The Ivalice Chronicles",
    "FINAL FANTASY TACTICS - The Ivalice Chronicles",
  ],
  "Best Sports/Racing Game": ["Mario Kart World"],
  "Best Adaptation": ["The Last of Us: Season 2", "The Last of Us season 2"],
  "Most Anticipated Game": [
    "Grand Theft Auto VI",
    "Grand Theft Auto 6",
    "GTA 6",
  ],
  "Games for Impact": ["South of Midnight"],
  "Best Esports Game": ["Counter-Strike 2", "Counter Strike 2"],
  "Best Esports Athlete": ["Chovy — League of Legends", "Chovy"],
  "Best Esports Team": [
    "Team Vitality — Counter-Strike 2",
    "Team Vitality",
  ],
  "Best Community Support": [
    "Baldur's Gate 3",
    "Baldur's Gate III",
    "Baldurs Gate 3",
    "Baldurs Gate III",
  ],
  "Content Creator of the Year": ["MoistCr1TiKaL"],
  "Innovation in Accessibility": [
    "Doom: The Dark Ages",
    "DOOM: The Dark Ages",
  ],
  "Best VR/AR Game": ["The Midnight Walk"],
  "Players' Voice": ["Wuthering Waves"],
};

export function nomineeMatchesWinner(
  displayName: string,
  aliases: string[],
): boolean {
  const have = normalizeNomineeTitle(displayName);
  const wanted = aliases.map(normalizeNomineeTitle).filter(Boolean);
  return wanted.some(
    (alias) =>
      have === alias || have.startsWith(`${alias} `) || alias.startsWith(have),
  );
}

export function tga2025WinnerCoverage(): {
  missingCategories: string[];
  extraCategories: string[];
} {
  const labels = TGA_2025_CATEGORIES.map((row) => row.label);
  const missingCategories = labels.filter(
    (label) => !TGA_2025_WINNERS[label]?.length,
  );
  const extraCategories = Object.keys(TGA_2025_WINNERS).filter(
    (label) => !labels.includes(label),
  );
  return { missingCategories, extraCategories };
}
