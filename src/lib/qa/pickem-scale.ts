import { LOADTEST_EMAIL_DOMAIN, LOADTEST_TGA_YEAR } from "@/lib/qa/loadtest";

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
