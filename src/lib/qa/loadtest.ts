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

export const LOADTEST_TGA_OPEN_YEAR = 2098;
export const LOADTEST_TGA_LOCKED_YEAR = 2099;
export const LOADTEST_EDITION_FILLING_YEAR = 2026;
/** Same calendar year as QA showcase is fine: this is a different community. */
export const LOADTEST_EDITION_RESULTS_YEAR = 2025;

export const LOADTEST_WRITERS_MAX = 100;
export const LOADTEST_USERNAME_PREFIX = "gamies_qa_load_";
export const LOADTEST_EMAIL_DOMAIN = "example.com";

export const LOADTEST_SCENARIOS = [
  "general",
  "pickem-open",
  "pickem-locked",
  "editions-filling",
  "editions-results",
] as const;

export type LoadtestScenario = (typeof LOADTEST_SCENARIOS)[number];

export function isLoadtestScenario(raw: string): raw is LoadtestScenario {
  return (LOADTEST_SCENARIOS as readonly string[]).includes(raw);
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
export const LOADTEST_LIST_ITEM_COUNT = 5;
export const LOADTEST_BALLOT_ITEM_COUNT = 10;

export type LoadtestGame = {
  id: string;
  slug: string;
  igdbId: number;
  band: "popular" | "unpopular";
};

export type LoadtestFixturesFile = {
  communitySlug: string;
  communityId: string;
  fillingYear: number;
  resultsYear: number;
  resultsCategoryId: string;
  tgaOpenYear: number;
  tgaLockedYear: number;
  tgaOpenPicks: Record<string, string>;
  tgaLockedPicks: Record<string, string>;
  game: { id: string; slug: string; igdbId: number };
  /** Catalog pool for list/library/GET rotation. Optional on older fixture files. */
  games?: LoadtestGame[];
  /** Filling-year pool for ballot rotation. */
  ballotGames?: LoadtestGame[];
  ballotItems: Array<{ gameId: string; rank: number }>;
  writerCount: number;
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
