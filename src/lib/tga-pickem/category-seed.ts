export type TgaCategoryKind = "game" | "other";

export type TgaSeedCategory = {
  label: string;
  kind: TgaCategoryKind;
  description?: string;
};

/** Official The Game Awards 2025 award names, order, and kind. */
export const TGA_2025_CATEGORIES: TgaSeedCategory[] = [
  { label: "Game of the Year", kind: "game" },
  { label: "Best Game Direction", kind: "game" },
  { label: "Best Narrative", kind: "game" },
  { label: "Best Art Direction", kind: "game" },
  { label: "Best Score and Music", kind: "game" },
  { label: "Best Audio Design", kind: "game" },
  { label: "Best Performance", kind: "other" },
  { label: "Best Independent Game", kind: "game" },
  { label: "Best Multiplayer", kind: "game" },
  { label: "Best Mobile Game", kind: "game" },
  { label: "Best Ongoing Game", kind: "game" },
  { label: "Best Debut Indie Game", kind: "game" },
  { label: "Best Action Game", kind: "game" },
  { label: "Best Action/Adventure Game", kind: "game" },
  { label: "Best RPG", kind: "game" },
  { label: "Best Fighting Game", kind: "game" },
  { label: "Best Family Game", kind: "game" },
  { label: "Best Sim/Strategy Game", kind: "game" },
  { label: "Best Sports/Racing Game", kind: "game" },
  { label: "Best Adaptation", kind: "other" },
  { label: "Most Anticipated Game", kind: "game" },
  { label: "Games for Impact", kind: "game" },
  { label: "Best Esports Game", kind: "game" },
  { label: "Best Esports Athlete", kind: "other" },
  { label: "Best Esports Team", kind: "other" },
  { label: "Best Community Support", kind: "game" },
  { label: "Content Creator of the Year", kind: "other" },
  { label: "Innovation in Accessibility", kind: "game" },
  { label: "Best VR/AR Game", kind: "game" },
  { label: "Players' Voice", kind: "game" },
];

export function seedCategoryRows(defs: TgaSeedCategory[] = TGA_2025_CATEGORIES) {
  return defs.map((def, index) => ({
    label: def.label,
    kind: def.kind,
    description: def.description ?? null,
    sortOrder: index + 1,
  }));
}
