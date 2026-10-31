import {
  LOADTEST_EMAIL_DOMAIN,
  LOADTEST_TGA_YEAR,
  type LoadtestGame,
  type LoadtestTgaSlateCategory,
} from "@/lib/qa/loadtest";

/**
 * Staging scale fixtures: many public communities sharing a pool of real
 * Better Auth users (signed-in Pick’em + GOTY editions).
 */
export const PICKEM_SCALE_SLUG_PREFIX = "seed_pem_";
/** Legacy is_seed profiles from the pre-Auth scale seed. */
export const PICKEM_SCALE_LEGACY_AUTH_PREFIX = "seed:pickemscale:";
export const PICKEM_SCALE_LEGACY_USERNAME_PREFIX = "seedpmu";

export const PICKEM_SCALE_USERNAME_PREFIX = "gamies_qa_scale_";
export const PICKEM_SCALE_EMAIL_LOCAL_PREFIX = "thegamies-qa-scale-";
/** Written by `qa:pickem-scale`, read by `cost:load --scenario=scale`. */
export const PICKEM_SCALE_FIXTURES_DIR = "e2e/.auth/scale";

/** Shared Auth pool size (sign-up cost). */
export const PICKEM_SCALE_USERS_MAX = 50;
/** Communities are cheap SQL; editions×ballots still bound the useful max. */
export const PICKEM_SCALE_COMMUNITIES_MAX = 100;
export const PICKEM_SCALE_DEFAULT_USERS = 50;
export const PICKEM_SCALE_DEFAULT_COMMUNITIES = 50;
export const PICKEM_SCALE_DEFAULT_YEAR = LOADTEST_TGA_YEAR;
/** First N scale accounts marked as edition Hosts / voices. */
export const PICKEM_SCALE_EDITION_HOSTS = 3;
export const PICKEM_SCALE_BALLOT_LIST_SIZE = 10;

/** @deprecated Use PICKEM_SCALE_COMMUNITIES_MAX / PICKEM_SCALE_USERS_MAX. */
export const PICKEM_SCALE_MAX = PICKEM_SCALE_COMMUNITIES_MAX;

/** One nominee per award. The nominee id is part of the key so voters diverge. */
export const PICKEM_SCALE_NOMINEE_RANK =
  "md5(p.id::text || c.id::text || cn.nominee_id::text)";

export function pickemScaleAccount(index: number): {
  index: number;
  email: string;
  username: string;
  displayName: string;
} {
  if (
    !Number.isInteger(index) ||
    index < 1 ||
    index > PICKEM_SCALE_USERS_MAX
  ) {
    throw new Error(
      `Scale account index must be 1–${PICKEM_SCALE_USERS_MAX}.`,
    );
  }
  const n = String(index).padStart(3, "0");
  return {
    index,
    email: `${PICKEM_SCALE_EMAIL_LOCAL_PREFIX}${n}@${LOADTEST_EMAIL_DOMAIN}`,
    username: `${PICKEM_SCALE_USERNAME_PREFIX}${n}`,
    displayName: `QA Scale ${n}`,
  };
}

export function pickemScaleCommunitySlug(index: number): string {
  return `${PICKEM_SCALE_SLUG_PREFIX}${String(index).padStart(4, "0")}`;
}

export function pickemScaleCommunityName(index: number): string {
  return `QA Scale ${String(index).padStart(4, "0")}`;
}

export function parsePickemScaleUsers(
  raw: unknown,
): number | { error: string } {
  return parseBoundedCount(raw, "Users", PICKEM_SCALE_USERS_MAX);
}

export function parsePickemScaleCommunities(
  raw: unknown,
): number | { error: string } {
  return parseBoundedCount(raw, "Communities", PICKEM_SCALE_COMMUNITIES_MAX);
}

/** @deprecated Prefer parsePickemScaleUsers / parsePickemScaleCommunities. */
export function parsePickemScaleCount(
  raw: unknown,
  label: string,
): number | { error: string } {
  const max =
    label === "Users" ? PICKEM_SCALE_USERS_MAX : PICKEM_SCALE_COMMUNITIES_MAX;
  return parseBoundedCount(raw, label, max);
}

function parseBoundedCount(
  raw: unknown,
  label: string,
  max: number,
): number | { error: string } {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 1) {
    return { error: `${label} must be an integer from 1 to ${max}.` };
  }
  if (n > max) {
    return { error: `${label} cannot exceed ${max}.` };
  }
  return n;
}

export function pickemScaleSheetCount(communities: number, users: number): number {
  return communities * users;
}

export function isPickemScaleEmail(email: string): boolean {
  return new RegExp(
    `^${PICKEM_SCALE_EMAIL_LOCAL_PREFIX}\\d{3}@${LOADTEST_EMAIL_DOMAIN}$`,
    "i",
  ).test(email.trim());
}

export function isPickemScaleUsername(username: string): boolean {
  return new RegExp(`^${PICKEM_SCALE_USERNAME_PREFIX}\\d{3}$`).test(
    username.trim().toLowerCase(),
  );
}

export function isPickemScaleCommunitySlug(slug: string): boolean {
  return new RegExp(`^${PICKEM_SCALE_SLUG_PREFIX}\\d{4}$`).test(
    slug.trim().toLowerCase(),
  );
}

export type ScaleFixturesCommunity = {
  slug: string;
  id: string;
  categoryId: string;
};

/** Fixture file for the scale cost:load scenario. */
export type ScaleFixturesFile = {
  year: number;
  communities: ScaleFixturesCommunity[];
  userCount: number;
  tgaYear: number;
  tgaSlate: LoadtestTgaSlateCategory[];
  tgaPicks: Record<string, string>;
  game: { id: string; slug: string; igdbId: number };
  games?: LoadtestGame[];
  ballotGames?: LoadtestGame[];
  ballotItems: Array<{ gameId: string; rank: number }>;
};

export function assertScaleFixturesSafe(
  fixtures: Pick<ScaleFixturesFile, "communities" | "userCount">,
): string | null {
  if (!Array.isArray(fixtures.communities) || fixtures.communities.length < 1) {
    return "Scale fixtures need at least one community.";
  }
  for (const row of fixtures.communities) {
    if (!isPickemScaleCommunitySlug(row.slug)) {
      return "Scale fixtures must use seed_pem_* community slugs.";
    }
  }
  if (
    !Number.isInteger(fixtures.userCount) ||
    fixtures.userCount < 1 ||
    fixtures.userCount > PICKEM_SCALE_USERS_MAX
  ) {
    return `Scale fixtures userCount must be 1–${PICKEM_SCALE_USERS_MAX}.`;
  }
  return null;
}

export function pickScaleCommunity(
  communities: ScaleFixturesCommunity[],
  random: () => number = Math.random,
): ScaleFixturesCommunity {
  if (communities.length === 0) {
    throw new Error("Scale community pool is empty.");
  }
  return communities[
    Math.min(communities.length - 1, Math.floor(random() * communities.length))
  ]!;
}
