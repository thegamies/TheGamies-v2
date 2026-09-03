import { and, eq, inArray, like } from "drizzle-orm";
import { profiles, type Db } from "@thegamies/db";

/** Shared marker for synthetic ops profiles. Auth ids still use `seed:…` prefixes. */
export const SEED_AUTH_ID_PREFIX = "seed:";

export function isSeedAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(SEED_AUTH_ID_PREFIX);
}

/** All synthetic accounts — use this to clean up later, even if auth ids were rewritten. */
export function seedAccountsWhere() {
  return eq(profiles.isSeed, true);
}

/** One seed family (community vs standings), for index/batch ops. */
export function seedAccountsWithAuthPrefixWhere(authPrefix: string) {
  return and(
    eq(profiles.isSeed, true),
    like(profiles.authUserId, `${authPrefix}%`),
  );
}

export function seedProfileCreateFields() {
  return { isSeed: true as const };
}

export async function markProfilesAsSeed(
  profileIds: string[],
  db: Db,
): Promise<void> {
  if (profileIds.length === 0) return;
  await db
    .update(profiles)
    .set({ isSeed: true })
    .where(and(inArray(profiles.id, profileIds), eq(profiles.isSeed, false)));
}
