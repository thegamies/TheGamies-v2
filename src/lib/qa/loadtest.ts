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
  ballotItems: Array<{ gameId: string; rank: number }>;
  writerCount: number;
};

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
