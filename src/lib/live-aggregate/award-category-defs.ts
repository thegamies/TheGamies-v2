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
  description: string;
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
  description: string,
  allowEditions = false,
): AwardCategoryDef {
  return {
    id,
    label,
    description,
    sortOrder,
    group,
    eligibility,
    allowEditions,
  };
}

/** Canonical site award categories (sort order is the published rank, 1–86). */
export const AWARD_CATEGORY_DEFS: AwardCategoryDef[] = [
  def(1, "best-gameplay", "Best Gameplay", "premier", "current_year", "The game that felt best to play."),
  def(2, "narrative", "Best Story", "premier", "current_year", "The story you couldn't stop thinking about."),
  def(3, "art-direction", "Best Art Direction", "premier", "current_year", "A world with a look all its own."),
  def(4, "soundtrack", "Best Soundtrack", "premier", "current_year", "The music that stayed with you after you stopped playing."),
  def(5, "indie", "Best Indie Game", "major", "current_year", "A smaller production that made a huge impression."),
  def(6, "best-multiplayer", "Best Multiplayer", "major", "current_or_active", "Better because you're playing with—or against—someone else."),
  def(7, "most-anticipated-game", "Most Anticipated Game", "special", "upcoming", "The game you need to play next."),
  def(8, "best-new-ip", "Best New IP", "major", "current_year", "The best brand-new world, idea, or franchise."),
  def(9, "best-ongoing-game", "Best Ongoing Game", "major", "active_in_year", "Still giving you reasons to come back."),
  def(10, "most-innovative", "Most Innovative", "fun", "current_year", "The game that tried something genuinely different."),
  def(11, "best-audio-design", "Best Audio Design", "premier", "current_year", "Every hit, footstep, explosion, and quiet moment sounds just right."),
  def(12, "biggest-surprise", "Biggest Surprise", "fun", "current_year", "You expected little. You got something special."),
  def(13, "best-remake-remaster", "Best Remake / Remaster", "special", "current_year", "An old favorite made worth playing all over again.", true),
  def(14, "most-underrated", "Most Underrated", "fun", "current_year", "More people should be talking about this game."),
  def(15, "best-combat", "Best Combat", "gameplay", "current_year", "Fighting so good you look forward to the next encounter."),
  def(16, "best-expansion-dlc", "Best Expansion / DLC", "special", "current_year", "The add-on that gave you a reason to jump back in.", true),
  def(17, "best-game-to-play-with-friends", "Best Game to Play With Friends", "community", "current_or_active", "Everything's better with the group."),
  def(18, "best-co-op", "Best Co-op", "multiplayer", "current_or_active", "The game you want a friend beside you for."),
  def(19, "best-level-design", "Best Level Design", "design", "current_year", "Every room, path, shortcut, and secret feels deliberately placed."),
  def(20, "best-worldbuilding", "Best Worldbuilding", "design", "current_year", "A place that feels like it existed before you arrived."),
  def(21, "best-exploration", "Best Exploration", "gameplay", "current_year", "The game that always rewarded taking the long way around."),
  def(22, "best-boss-battles", "Best Boss Battles", "gameplay", "current_year", "The fights you'll still be talking about years later."),
  def(23, "best-replayability", "Best Replayability", "fun", "current_year", "Finishing it just made you want to start again."),
  def(24, "best-open-world", "Best Open World", "design", "current_year", "A world worth ignoring the main quest for."),
  def(25, "best-rpg", "Best RPG", "genre", "current_year", "The adventure where your character, choices, and progression mattered most."),
  def(26, "best-action-adventure", "Best Action / Adventure", "genre", "current_year", "Exploration, action, and adventure at their best."),
  def(27, "best-action-game", "Best Action Game", "genre", "current_year", "Pure action that just feels great to play."),
  def(28, "best-horror-game", "Best Horror Game", "genre", "current_year", "The game you maybe shouldn't have played with the lights off."),
  def(29, "best-movement", "Best Movement", "gameplay", "current_year", "Simply controlling your character feels incredible."),
  def(30, "most-emotional-game", "Most Emotional Game", "fun", "current_year", "The one that hit you harder than expected."),
  def(31, "best-debut-indie", "Best Debut Indie", "major", "current_year", "An unforgettable first showing from a new studio."),
  def(32, "best-progression-system", "Best Progression System", "systems", "current_year", "Getting stronger never stopped feeling rewarding."),
  def(33, "best-sports-racing", "Best Sports / Racing", "genre", "current_year", "The best competition on the field, court, track, or road."),
  def(34, "best-sim-strategy", "Best Sim / Strategy", "genre", "current_year", "The game that made every decision count."),
  def(35, "best-platformer", "Best Platformer", "genre", "current_year", "Jumping, climbing, bouncing, and falling done right."),
  def(36, "best-fighting-game", "Best Fighting Game", "genre", "current_year", "The best game for settling things one round at a time."),
  def(37, "best-pvp", "Best PvP", "multiplayer", "current_or_active", "Nothing beats outplaying another human."),
  def(38, "best-gunplay", "Best Gunplay", "gameplay", "current_year", "Every shot just feels right."),
  def(39, "best-melee-combat", "Best Melee Combat", "gameplay", "current_year", "Up close and personal—and incredibly satisfying."),
  def(40, "best-enemy-design", "Best Enemy Design", "gameplay", "current_year", "Enemies that made every encounter interesting."),
  def(41, "best-family-game", "Best Family Game", "genre", "current_year", "The game everyone can get in on."),
  def(42, "best-puzzle-game", "Best Puzzle Game", "genre", "current_year", "The one that made being stuck feel worth it."),
  def(43, "best-survival-game", "Best Survival Game", "genre", "current_year", "When simply staying alive is half the fun."),
  def(44, "best-cozy-game", "Best Cozy Game", "genre", "current_year", "The gaming equivalent of a warm blanket."),
  def(45, "best-roguelike-roguelite", "Best Roguelike / Roguelite", "genre", "current_year", "Just one more run. Okay, maybe five."),
  def(46, "best-party-game", "Best Party Game", "genre", "current_year", "The game that gets everyone yelling at the screen."),
  def(47, "best-metroidvania", "Best Metroidvania", "genre", "current_year", "Getting lost has never felt so rewarding."),
  def(48, "best-puzzle-design", "Best Puzzle Design", "gameplay", "current_year", "The best \"wait... I got it!\" moments of the year."),
  def(49, "best-stealth", "Best Stealth", "gameplay", "current_year", "Getting in and out without anyone knowing you were there."),
  def(50, "best-traversal", "Best Traversal", "gameplay", "current_year", "Getting there is just as fun as being there."),
  def(51, "scariest-game", "Scariest Game", "fun", "current_year", "Nope. Nope. Nope."),
  def(52, "funniest-game", "Funniest Game", "fun", "current_year", "The game that actually made you laugh."),
  def(53, "most-relaxing-game", "Most Relaxing Game", "fun", "current_year", "No stress. No rush. Just a good time."),
  def(54, "best-buildcrafting", "Best Buildcrafting", "systems", "current_year", "Half the game is playing. The other half is perfecting your build."),
  def(55, "best-character-creator", "Best Character Creator", "systems", "current_year", "Where \"I'll just make my character real quick\" becomes an hour."),
  def(56, "best-customization", "Best Customization", "systems", "current_year", "The game that really lets you make it yours."),
  def(57, "best-skill-tree", "Best Skill Tree", "systems", "current_year", "Every point spent comes with a difficult decision."),
  def(58, "best-loot-system", "Best Loot System", "systems", "current_year", "Always chasing that next drop."),
  def(59, "best-magic-system", "Best Magic System", "gameplay", "current_year", "The game that made casting spells feel truly powerful."),
  def(60, "best-difficulty-design", "Best Difficulty Design", "gameplay", "current_year", "Tough enough to test you, fair enough to keep you trying."),
  def(61, "best-accessibility", "Best Accessibility", "craft", "current_or_active", "More ways for more people to play."),
  def(62, "best-ui-ux", "Best UI / UX", "technical", "current_year", "Everything is exactly where you expect it to be."),
  def(63, "best-one-more-run-game", "Best “One More Run” Game", "community", "current_year", "You know exactly what \"one more\" actually means."),
  def(64, "most-addictive", "Most Addictive", "fun", "current_year", "You were going to stop an hour ago."),
  def(65, "best-local-multiplayer", "Best Local Multiplayer", "multiplayer", "current_or_active", "Same game. Same couch. Questionable friendships afterward."),
  def(66, "best-parry-system", "Best Parry System", "gameplay", "current_year", "That perfect clang that makes you feel unstoppable."),
  def(67, "best-dodge-dash", "Best Dodge / Dash", "gameplay", "current_year", "Getting out of the way is half the fun."),
  def(68, "best-crafting-system", "Best Crafting System", "systems", "current_year", "Turning a pile of stuff into something you actually want."),
  def(69, "best-endgame", "Best Endgame", "systems", "current_year", "The credits rolled. You kept playing."),
  def(70, "best-photo-mode", "Best Photo Mode", "craft", "current_year", "Sometimes playing the game means stopping to take pictures."),
  def(71, "best-physics", "Best Physics", "technical", "current_year", "When the game's rules create their own kind of fun."),
  def(72, "best-destruction", "Best Destruction", "technical", "current_year", "If it's there, you should probably be able to break it."),
  def(73, "best-ai", "Best AI", "technical", "current_year", "Enemies and characters that actually seem to know what they're doing."),
  def(74, "best-mobile-game", "Best Mobile Game", "platform", "current_year", "The best game made for your pocket."),
  def(75, "best-vr-ar-game", "Best VR / AR Game", "platform", "current_year", "The experience that made stepping inside the game worth it."),
  def(76, "best-game-to-watch", "Best Game to Watch", "community", "current_or_active", "Almost as much fun to watch as it is to play."),
  def(77, "best-game-you-finally-played", "Best Game You Finally Played", "community", "any_year", "Better late than never."),
  def(78, "biggest-disappointment", "Biggest Disappointment", "fun", "current_year", "You wanted to love it. You really did."),
  def(79, "best-social-mechanics", "Best Social Mechanics", "multiplayer", "current_or_active", "The game that found clever ways to bring players together."),
  def(80, "best-multiplayer-progression", "Best Multiplayer Progression", "multiplayer", "current_or_active", "Always one more unlock worth chasing."),
  def(81, "best-tutorial-onboarding", "Best Tutorial / Onboarding", "technical", "current_year", "Teaching you how to play without feeling like homework."),
  def(82, "best-procedural-generation", "Best Procedural Generation", "technical", "current_year", "A game that keeps finding new ways to surprise you."),
  def(83, "best-inventory-system", "Best Inventory System", "systems", "current_year", "Somehow, managing all your stuff is actually enjoyable."),
  def(84, "best-economy", "Best Economy", "systems", "current_year", "Buying, selling, earning, and spending that actually works."),
  def(85, "best-new-game-plus", "Best New Game+", "systems", "current_year", "Because once wasn't enough."),
  def(86, "wish-i-played", "Wish I Played", "community", "current_year", "The one everyone loved while your backlog quietly judged you."),
];

export const DEFAULT_AWARD_CATEGORY_GROUP: AwardCategoryGroup = "premier";

/** Live Categories filter — includes an All bucket across groups. */
export type StandingsCategoryGroupFilter = AwardCategoryGroup | "all";
export const DEFAULT_STANDINGS_CATEGORY_GROUP: StandingsCategoryGroupFilter =
  "all";

export const STANDINGS_CATEGORY_GROUP_LABEL: Record<
  StandingsCategoryGroupFilter,
  string
> = {
  all: "All",
  ...AWARD_CATEGORY_GROUP_LABEL,
};

/** Live standings board: GOTY grid, Categories index, or one full category. */
export const LIVE_STANDINGS_VIEWS = ["goty", "categories", "category"] as const;
export type LiveStandingsViewId = (typeof LIVE_STANDINGS_VIEWS)[number];
export const DEFAULT_LIVE_STANDINGS_VIEW: LiveStandingsViewId = "goty";

/** Categories index: games with displayed rank ≤ this. */
export const CATEGORY_LIST_TOP_RANKS = 3;
/** Categories index: chapters shown before Load more. */
export const CATEGORY_LIST_PAGE_SIZE = 10;
/** Full category board: game rows per page. */
export const CATEGORY_DETAIL_PAGE_SIZE = 50;

export function parseLiveStandingsView(raw: unknown): LiveStandingsViewId {
  if (raw === "categories" || raw === "category") return raw;
  return DEFAULT_LIVE_STANDINGS_VIEW;
}

export function parseStandingsCategoryGroup(
  raw: unknown,
): StandingsCategoryGroupFilter {
  if (raw === "all" || raw == null || raw === "") {
    return DEFAULT_STANDINGS_CATEGORY_GROUP;
  }
  if (
    typeof raw === "string" &&
    (AWARD_CATEGORY_GROUPS as readonly string[]).includes(raw)
  ) {
    return raw as AwardCategoryGroup;
  }
  return DEFAULT_STANDINGS_CATEGORY_GROUP;
}

export function standingsQueryString(opts: {
  page?: number;
  group?: StandingsCategoryGroupFilter;
  view?: LiveStandingsViewId;
  category?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.page != null && opts.page > 1) {
    params.set("page", String(opts.page));
  }
  const group = opts.group ?? DEFAULT_STANDINGS_CATEGORY_GROUP;
  if (group !== DEFAULT_STANDINGS_CATEGORY_GROUP) {
    params.set("group", group);
  }
  const view = opts.view ?? DEFAULT_LIVE_STANDINGS_VIEW;
  if (view !== DEFAULT_LIVE_STANDINGS_VIEW) {
    params.set("view", view);
  }
  if (opts.category) {
    params.set("category", opts.category);
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
