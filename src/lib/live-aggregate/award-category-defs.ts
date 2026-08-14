export const AWARD_CATEGORY_GROUPS = [
  "premier",
  "major",
  "genre",
  "platform",
  "craft",
  "special",
  "gameplay",
  "design",
  "systems",
  "technical",
  "multiplayer",
  "fun",
  "community",
] as const;

export type AwardCategoryGroup = (typeof AWARD_CATEGORY_GROUPS)[number];

export const AWARD_CATEGORY_ELIGIBILITIES = [
  "current_year",
  "current_or_active",
  "active_in_year",
  "upcoming",
  "any_year",
] as const;

export type AwardCategoryEligibility =
  (typeof AWARD_CATEGORY_ELIGIBILITIES)[number];

export type AwardCategoryDef = {
  id: string;
  label: string;
  sortOrder: number;
  group: AwardCategoryGroup;
  eligibility: AwardCategoryEligibility;
  allowEditions: boolean;
};

export const AWARD_CATEGORY_GROUP_LABEL: Record<AwardCategoryGroup, string> = {
  premier: "Premier",
  major: "Major",
  genre: "Genre",
  platform: "Platform",
  craft: "Craft",
  special: "Special",
  gameplay: "Gameplay",
  design: "Design",
  systems: "Systems",
  technical: "Technical",
  multiplayer: "Multiplayer",
  fun: "Fun",
  community: "Community",
};

export const AWARD_CATEGORY_ELIGIBILITY_LABEL: Record<
  AwardCategoryEligibility,
  string
> = {
  current_year: "Current year",
  current_or_active: "Current or active",
  active_in_year: "Active in year",
  upcoming: "Upcoming",
  any_year: "Any year",
};

function def(
  sortOrder: number,
  id: string,
  label: string,
  group: AwardCategoryGroup,
  eligibility: AwardCategoryEligibility,
  allowEditions = false,
): AwardCategoryDef {
  return { id, label, sortOrder, group, eligibility, allowEditions };
}

/** Canonical site award categories (sort order matches the published list). */
export const AWARD_CATEGORY_DEFS: AwardCategoryDef[] = [
  def(2, "best-game-design", "Best Game Design", "premier", "current_year"),
  def(3, "narrative", "Best Story", "premier", "current_year"),
  def(4, "art-direction", "Best Art Direction", "premier", "current_year"),
  def(5, "soundtrack", "Best Soundtrack", "premier", "current_year"),
  def(6, "best-audio-design", "Best Audio Design", "premier", "current_year"),
  def(7, "indie", "Best Indie Game", "major", "current_year"),
  def(8, "best-multiplayer", "Best Multiplayer", "major", "current_or_active"),
  def(9, "best-ongoing-game", "Best Ongoing Game", "major", "active_in_year"),
  def(10, "best-action-adventure", "Best Action / Adventure", "genre", "current_year"),
  def(11, "best-rpg", "Best RPG", "genre", "current_year"),
  def(12, "best-action-game", "Best Action Game", "genre", "current_year"),
  def(13, "best-fighting-game", "Best Fighting Game", "genre", "current_year"),
  def(14, "best-sim-strategy", "Best Sim / Strategy", "genre", "current_year"),
  def(15, "best-sports-racing", "Best Sports / Racing", "genre", "current_year"),
  def(16, "best-family-game", "Best Family Game", "genre", "current_year"),
  def(17, "best-debut-indie", "Best Debut Indie", "major", "current_year"),
  def(18, "best-mobile-game", "Best Mobile Game", "platform", "current_year"),
  def(19, "best-vr-ar-game", "Best VR / AR Game", "platform", "current_year"),
  def(20, "best-accessibility", "Best Accessibility", "craft", "current_or_active"),
  def(21, "most-anticipated-game", "Most Anticipated Game", "special", "upcoming"),
  def(22, "best-remake-remaster", "Best Remake / Remaster", "special", "current_year", true),
  def(23, "best-expansion-dlc", "Best Expansion / DLC", "special", "current_year", true),
  def(24, "best-new-ip", "Best New IP", "special", "current_year"),
  def(25, "best-combat", "Best Combat", "gameplay", "current_year"),
  def(26, "best-boss-battles", "Best Boss Battles", "gameplay", "current_year"),
  def(27, "best-melee-combat", "Best Melee Combat", "gameplay", "current_year"),
  def(28, "best-gunplay", "Best Gunplay", "gameplay", "current_year"),
  def(29, "best-parry-system", "Best Parry System", "gameplay", "current_year"),
  def(30, "best-magic-system", "Best Magic System", "gameplay", "current_year"),
  def(31, "best-stealth", "Best Stealth", "gameplay", "current_year"),
  def(32, "best-enemy-design", "Best Enemy Design", "gameplay", "current_year"),
  def(33, "best-difficulty-design", "Best Difficulty Design", "gameplay", "current_year"),
  def(34, "best-movement", "Best Movement", "gameplay", "current_year"),
  def(35, "best-traversal", "Best Traversal", "gameplay", "current_year"),
  def(36, "best-exploration", "Best Exploration", "gameplay", "current_year"),
  def(37, "best-level-design", "Best Level Design", "design", "current_year"),
  def(38, "best-open-world", "Best Open World", "design", "current_year"),
  def(39, "best-worldbuilding", "Best Worldbuilding", "design", "current_year"),
  def(40, "best-buildcrafting", "Best Buildcrafting", "systems", "current_year"),
  def(41, "best-progression-system", "Best Progression System", "systems", "current_year"),
  def(42, "best-loot-system", "Best Loot System", "systems", "current_year"),
  def(43, "best-crafting-system", "Best Crafting System", "systems", "current_year"),
  def(44, "best-character-creator", "Best Character Creator", "systems", "current_year"),
  def(45, "best-customization", "Best Customization", "systems", "current_year"),
  def(46, "best-physics", "Best Physics", "technical", "current_year"),
  def(47, "best-destruction", "Best Destruction", "technical", "current_year"),
  def(48, "best-ai", "Best AI", "technical", "current_year"),
  def(49, "best-puzzle-design", "Best Puzzle Design", "gameplay", "current_year"),
  def(50, "best-ui-ux", "Best UI / UX", "technical", "current_year"),
  def(51, "best-co-op", "Best Co-op", "multiplayer", "current_or_active"),
  def(52, "best-pvp", "Best PvP", "multiplayer", "current_or_active"),
  def(53, "biggest-surprise", "Biggest Surprise", "fun", "current_year"),
  def(54, "biggest-disappointment", "Biggest Disappointment", "fun", "current_year"),
  def(55, "most-underrated", "Most Underrated", "fun", "current_year"),
  def(56, "most-innovative", "Most Innovative", "fun", "current_year"),
  def(57, "funniest-game", "Funniest Game", "fun", "current_year"),
  def(58, "scariest-game", "Scariest Game", "fun", "current_year"),
  def(59, "most-emotional-game", "Most Emotional Game", "fun", "current_year"),
  def(60, "best-game-you-finally-played", "Best Game You Finally Played", "community", "any_year"),
  def(61, "wish-i-played", "Wish I Played", "community", "current_year"),
  def(62, "best-game-to-play-with-friends", "Best Game to Play With Friends", "community", "current_or_active"),
  def(63, "best-game-to-watch", "Best Game to Watch", "community", "current_or_active"),
  def(64, "best-one-more-run-game", "Best “One More Run” Game", "community", "current_year"),
];

export const DEFAULT_AWARD_CATEGORY_GROUP: AwardCategoryGroup = "premier";

export function standingsQueryString(opts: {
  page?: number;
  group?: AwardCategoryGroup;
}): string {
  const params = new URLSearchParams();
  if (opts.page != null && opts.page > 1) {
    params.set("page", String(opts.page));
  }
  const group = opts.group ?? DEFAULT_AWARD_CATEGORY_GROUP;
  if (group !== DEFAULT_AWARD_CATEGORY_GROUP) {
    params.set("group", group);
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function parseAwardCategoryGroup(
  raw: unknown,
): AwardCategoryGroup {
  if (
    typeof raw === "string" &&
    (AWARD_CATEGORY_GROUPS as readonly string[]).includes(raw)
  ) {
    return raw as AwardCategoryGroup;
  }
  return DEFAULT_AWARD_CATEGORY_GROUP;
}

export function parseAwardCategoryEligibility(
  raw: unknown,
): AwardCategoryEligibility {
  if (
    typeof raw === "string" &&
    (AWARD_CATEGORY_ELIGIBILITIES as readonly string[]).includes(raw)
  ) {
    return raw as AwardCategoryEligibility;
  }
  return "current_year";
}
