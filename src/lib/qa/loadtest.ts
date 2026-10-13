import { QA_COMMUNITIES } from "@/lib/qa/staging-fixtures";
import { parseOwnedUsername } from "@/lib/profile/username";

/** Dedicated load-test community. Never the QA showcase slug. */
export const LOADTEST_COMMUNITY = {
  name: "Gamies QA Load",
  slug: "gamies_qa_load",
  description: "Automated staging load tests. Not a real community.",
  visibility: "public" as const,
  joinsClosed: false,
};

/** Real TGA slate on staging. The pickem load run opens it, then locks at halfway. */
export const LOADTEST_TGA_YEAR = 2025;
/** Leftover synthetic years from the old two-year mix. Purge may delete these. */
export const LEGACY_LOADTEST_TGA_YEARS = [2098, 2099] as const;
export const LOADTEST_EDITION_FILLING_YEAR = 2026;
/** Same calendar year as QA showcase is fine: this is a different community. */
export const LOADTEST_EDITION_RESULTS_YEAR = 2025;

export const LOADTEST_WRITERS_MAX = 100;
export const LOADTEST_USERNAME_PREFIX = "gamies_qa_load_";
export const LOADTEST_EMAIL_DOMAIN = "example.com";

export const LOADTEST_SCENARIOS = [
  "general",
  "pickem",
  "editions-filling",
  "editions-results",
] as const;

export type LoadtestScenario = (typeof LOADTEST_SCENARIOS)[number];

export function isLoadtestScenario(raw: string): raw is LoadtestScenario {
  return (LOADTEST_SCENARIOS as readonly string[]).includes(raw);
}

/** Old CLI names map onto the combined 2025 Pick’em run. */
export function resolveLoadtestScenario(raw: string): LoadtestScenario | null {
  if (raw === "pickem-open" || raw === "pickem-locked") return "pickem";
  if (isLoadtestScenario(raw)) return raw;
  return null;
}

export function loadtestAccount(index: number): {
  index: number;
  email: string;
  username: string;
  displayName: string;
} {
  if (!Number.isInteger(index) || index < 1 || index > LOADTEST_WRITERS_MAX) {
    throw new Error("Load-test account index must be 1–100.");
  }
  const n = String(index).padStart(3, "0");
  return {
    index,
    email: `thegamies-qa-load-${n}@${LOADTEST_EMAIL_DOMAIN}`,
    username: `${LOADTEST_USERNAME_PREFIX}${n}`,
    displayName: `QA Load ${n}`,
  };
}

export function isLoadtestEmail(email: string): boolean {
  return /^thegamies-qa-load-\d{3}@example\.com$/i.test(email.trim());
}

export function isLoadtestUsername(username: string): boolean {
  return new RegExp(`^${LOADTEST_USERNAME_PREFIX}\\d{3}$`).test(
    username.trim().toLowerCase(),
  );
}

/** Load-test writes name the writer. They do not sign in. */
export const LOADTEST_WRITER_HEADER = "x-loadtest-writer";

export function parseLoadtestWriterHeader(raw: string | null): number | null {
  const parsed = parseWriterCount(raw);
  if (typeof parsed !== "number" || parsed < 1) return null;
  return parsed;
}

export function loadtestSyntheticAuthUserId(index: number): string {
  const account = loadtestAccount(index);
  return `seed:loadtest:${account.username}`;
}

export function parseWriterCount(raw: unknown): number | { error: string } {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 0) {
    return { error: "Writers must be an integer from 0 to 100." };
  }
  if (n > LOADTEST_WRITERS_MAX) {
    return { error: `Writers cannot exceed ${LOADTEST_WRITERS_MAX}.` };
  }
  return n;
}

export function loadtestTgaOpenSchedule(now: Date): {
  opensAt: Date;
  showStartsAt: Date;
} {
  return {
    opensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    showStartsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
  };
}

export function loadtestTgaLockedSchedule(now: Date): {
  opensAt: Date;
  showStartsAt: Date;
} {
  return {
    opensAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    showStartsAt: new Date(now.getTime() - 60 * 60 * 1000),
  };
}

export function loadtestEditionOpenSchedule(now: Date): {
  opensAt: Date;
  closesAt: Date;
  publishesAt: Date;
} {
  return {
    opensAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    closesAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    publishesAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
  };
}

export const LOADTEST_POPULAR_POOL = 40;
export const LOADTEST_UNPOPULAR_POOL = 10;
export const LOADTEST_BALLOT_POPULAR_POOL = 20;
export const LOADTEST_BALLOT_UNPOPULAR_POOL = 5;
/** Chance a rotated pick comes from the popular band. */
export const LOADTEST_POPULAR_PICK_RATE = 0.8;
export const LOADTEST_LIST_ITEM_MIN = 1;
export const LOADTEST_LIST_ITEM_MAX = 10;
export const LOADTEST_LIST_ITEM_COUNT = LOADTEST_LIST_ITEM_MAX;
export const LOADTEST_BALLOT_ITEM_COUNT = 10;

export type LoadtestGame = {
  id: string;
  slug: string;
  igdbId: number;
  band: "popular" | "unpopular";
  /** Catalog title for search queries. Older fixture files omit it. */
  title?: string;
};

export type LoadtestTgaSlateCategory = {
  id: string;
  nomineeIds: string[];
};

/** One nominee per category so the sheet is complete. Rotates by writer. */
export function completeLoadtestTgaPicks(
  slate: LoadtestTgaSlateCategory[],
  writerIndex: number,
): Record<string, string> {
  const picks: Record<string, string> = {};
  const index = Math.max(0, Math.floor(writerIndex));
  for (const category of slate) {
    if (category.nomineeIds.length === 0) continue;
    picks[category.id] =
      category.nomineeIds[index % category.nomineeIds.length]!;
  }
  return picks;
}

export function loadtestTgaYearFromFixtures(
  fixtures: Pick<LoadtestFixturesFile, "tgaYear" | "tgaOpenYear">,
): number {
  return fixtures.tgaYear ?? fixtures.tgaOpenYear ?? LOADTEST_TGA_YEAR;
}

export function loadtestTgaSlateFromFixtures(
  fixtures: Pick<LoadtestFixturesFile, "tgaSlate" | "tgaPicks" | "tgaOpenPicks">,
): LoadtestTgaSlateCategory[] {
  if (fixtures.tgaSlate && fixtures.tgaSlate.length > 0) return fixtures.tgaSlate;
  const picks = fixtures.tgaPicks ?? fixtures.tgaOpenPicks ?? {};
  return Object.entries(picks).map(([id, nomineeId]) => ({
    id,
    nomineeIds: [nomineeId],
  }));
}

/** Public custom list planted by ensure so readers can hit share URLs. */
export type LoadtestShareList = {
  username: string;
  slug: string;
  publicId: string;
};

export const LOADTEST_SHARE_LIST_TITLE = "Load share";
export const LOADTEST_SHARE_LIST_SLUG = "load-share";

export type LoadtestFixturesFile = {
  communitySlug: string;
  communityId: string;
  fillingYear: number;
  resultsYear: number;
  resultsCategoryId: string;
  tgaYear: number;
  tgaSlate: LoadtestTgaSlateCategory[];
  /** Writer-0 complete sheet. Prefer `tgaSlate` + `completeLoadtestTgaPicks`. */
  tgaPicks: Record<string, string>;
  tgaOpenYear?: number;
  tgaLockedYear?: number;
  tgaOpenPicks?: Record<string, string>;
  tgaLockedPicks?: Record<string, string>;
  game: { id: string; slug: string; igdbId: number };
  /** Catalog pool for list/library/GET rotation. Optional on older fixture files. */
  games?: LoadtestGame[];
  /** Filling-year pool for ballot rotation. */
  ballotGames?: LoadtestGame[];
  ballotItems: Array<{ gameId: string; rank: number }>;
  writerCount: number;
  /** One public custom list per load-test account. Readers pick at random. */
  lists?: LoadtestShareList[];
};

export function mergeLoadtestGameBands(
  popular: Array<{ id: string; slug: string; igdbId: number }>,
  unpopular: Array<{ id: string; slug: string; igdbId: number }>,
): LoadtestGame[] {
  const seen = new Set<string>();
  const out: LoadtestGame[] = [];
  for (const row of popular) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({ ...row, band: "popular" });
  }
  for (const row of unpopular) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({ ...row, band: "unpopular" });
  }
  return out;
}

export function loadtestWriteGames(
  fixtures: Pick<LoadtestFixturesFile, "game" | "games">,
): LoadtestGame[] {
  if (fixtures.games && fixtures.games.length > 0) return fixtures.games;
  return [{ ...fixtures.game, band: "popular" }];
}

export function loadtestBallotGames(
  fixtures: Pick<LoadtestFixturesFile, "ballotItems" | "ballotGames" | "game">,
): LoadtestGame[] {
  if (fixtures.ballotGames && fixtures.ballotGames.length > 0) {
    return fixtures.ballotGames;
  }
  return fixtures.ballotItems.map((row, i) => ({
    id: row.gameId,
    slug: fixtures.game.slug,
    igdbId: fixtures.game.igdbId,
    band: i === 0 ? "popular" : "unpopular",
  }));
}

export function pickLoadtestGame(
  pool: LoadtestGame[],
  random: () => number = Math.random,
): LoadtestGame {
  if (pool.length === 0) {
    throw new Error("Load-test game pool is empty.");
  }
  const popular = pool.filter((row) => row.band === "popular");
  const unpopular = pool.filter((row) => row.band === "unpopular");
  const usePopular =
    popular.length > 0 &&
    (unpopular.length === 0 || random() < LOADTEST_POPULAR_PICK_RATE);
  const band = usePopular ? popular : unpopular.length > 0 ? unpopular : pool;
  return band[Math.min(band.length - 1, Math.floor(random() * band.length))]!;
}

export function pickLoadtestShareList(
  lists: LoadtestShareList[],
  random: () => number = Math.random,
): LoadtestShareList {
  if (lists.length === 0) {
    throw new Error("Load-test share list pool is empty.");
  }
  return lists[Math.min(lists.length - 1, Math.floor(random() * lists.length))]!;
}

export function pickLoadtestGames(
  pool: LoadtestGame[],
  count: number,
  random: () => number = Math.random,
): LoadtestGame[] {
  const want = Math.min(Math.max(0, count), pool.length);
  const picked: LoadtestGame[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (picked.length < want && guard < want * 40) {
    guard += 1;
    const row = pickLoadtestGame(pool, random);
    if (used.has(row.id)) continue;
    used.add(row.id);
    picked.push(row);
  }
  if (picked.length < want) {
    for (const row of pool) {
      if (used.has(row.id)) continue;
      used.add(row.id);
      picked.push(row);
      if (picked.length === want) break;
    }
  }
  return picked;
}

export function assertLoadtestFixturesSafe(
  fixtures: Pick<LoadtestFixturesFile, "communitySlug">,
): string | null {
  if (fixtures.communitySlug === QA_COMMUNITIES.showcase.slug) {
    return "Load-test fixtures must not use the QA showcase community.";
  }
  if (fixtures.communitySlug !== LOADTEST_COMMUNITY.slug) {
    return "Load-test fixtures must use the load community slug.";
  }
  return null;
}

export function loadtestAccountsValidThrough(maxIndex: number): boolean {
  for (let i = 1; i <= maxIndex; i++) {
    const account = loadtestAccount(i);
    if ("error" in parseOwnedUsername(account.username)) return false;
    if (!isLoadtestEmail(account.email)) return false;
  }
  return true;
}
