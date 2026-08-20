import { and, eq, isNull } from "drizzle-orm";
import { createDb, profiles, type Db } from "@thegamies/db";
import {
  USERNAME_COOLDOWN_MESSAGE,
  USERNAME_NOT_AVAILABLE,
  canChangeUsername,
  displayNameSchema,
  normalizeUsername,
  parseOwnedUsername,
} from "@/lib/profile/username";
import {
  mergeSocialLinks,
  socialLinksForStorage,
  validateAndNormalizeSocialLinksPatch,
  type SocialLinks,
} from "@/lib/profile/social-links";

export type Profile = typeof profiles.$inferSelect;
export { ownsProfile } from "@/lib/profile/ownership";


export function getDb(): Db {
  return createDb();
}

export async function getProfileByAuthUserId(
  authUserId: string,
  db: Db = getDb(),
): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(
      and(eq(profiles.authUserId, authUserId), isNull(profiles.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getProfileByUsername(
  username: string,
  db: Db = getDb(),
  opts: { includeDeleted?: boolean } = {},
): Promise<Profile | null> {
  const normalized = normalizeUsername(username);
  const rows = await db
    .select()
    .from(profiles)
    .where(
      opts.includeDeleted
        ? eq(profiles.username, normalized)
        : and(eq(profiles.username, normalized), isNull(profiles.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function usernameTaken(
  username: string,
  exceptAuthUserId?: string,
  db: Db = getDb(),
): Promise<boolean> {
  const existing = await getProfileByUsername(username, db, {
    includeDeleted: true,
  });
  if (!existing) return false;
  if (exceptAuthUserId && existing.authUserId === exceptAuthUserId) {
    return false;
  }
  return true;
}

/**
 * Ensure a profile row exists for this auth user.
 * Ownership is enforced by callers via session.user.id === authUserId.
 */
export async function ensureProfileForAuthUser(input: {
  authUserId: string;
  username: string;
  displayName: string;
}): Promise<{ profile: Profile; created: boolean } | { error: string }> {
  const usernameParsed = parseOwnedUsername(input.username);
  if ("error" in usernameParsed) {
    return { error: usernameParsed.error };
  }
  const displayParsed = displayNameSchema.safeParse(input.displayName);
  if (!displayParsed.success) {
    return { error: "Enter a display name." };
  }

  const db = getDb();
  const existing = await getProfileByAuthUserId(input.authUserId, db);
  if (existing) {
    return { profile: existing, created: false };
  }

  if (await usernameTaken(usernameParsed.username, undefined, db)) {
    return { error: USERNAME_NOT_AVAILABLE };
  }

  const inserted = await db
    .insert(profiles)
    .values({
      authUserId: input.authUserId,
      username: usernameParsed.username,
      displayName: displayParsed.data,
      visibility: "public",
    })
    .returning();

  const profile = inserted[0];
  if (!profile) {
    return { error: "Could not create profile." };
  }
  return { profile, created: true };
}

export async function updateOwnedProfile(input: {
  authUserId: string;
  username: string;
  displayName: string;
  bio?: string;
  visibility: "public" | "private";
  socialLinks?: SocialLinks;
}): Promise<{ profile: Profile } | { error: string }> {
  const usernameParsed = parseOwnedUsername(input.username);
  if ("error" in usernameParsed) {
    return { error: usernameParsed.error };
  }
  const displayParsed = displayNameSchema.safeParse(input.displayName);
  if (!displayParsed.success) {
    return { error: "Enter a display name." };
  }

  const db = getDb();
  const existing = await getProfileByAuthUserId(input.authUserId, db);
  if (!existing) {
    return { error: "Profile not found." };
  }

  const usernameChanged = existing.username !== usernameParsed.username;
  if (usernameChanged && !canChangeUsername(existing.usernameChangedAt)) {
    return { error: USERNAME_COOLDOWN_MESSAGE };
  }

  if (await usernameTaken(usernameParsed.username, input.authUserId, db)) {
    return { error: USERNAME_NOT_AVAILABLE };
  }

  let socialLinks: Record<string, string> | null | undefined;
  if (input.socialLinks) {
    try {
      const patch = validateAndNormalizeSocialLinksPatch(input.socialLinks);
      socialLinks = socialLinksForStorage(
        mergeSocialLinks(existing.socialLinks, patch),
      );
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Check the social links and try again.",
      };
    }
  }

  const now = new Date();
  const updated = await db
    .update(profiles)
    .set({
      username: usernameParsed.username,
      displayName: displayParsed.data,
      bio: input.bio?.trim() ? input.bio.trim() : null,
      visibility: input.visibility,
      ...(socialLinks !== undefined ? { socialLinks } : {}),
      ...(usernameChanged ? { usernameChangedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(profiles.authUserId, input.authUserId))
    .returning();

  const profile = updated[0];
  if (!profile) {
    return { error: "Could not update profile." };
  }
  return { profile };
}

export async function updateOwnedAvatarUrl(input: {
  authUserId: string;
  avatarUrl: string | null;
}): Promise<{ profile: Profile } | { error: string }> {
  const db = getDb();
  const existing = await getProfileByAuthUserId(input.authUserId, db);
  if (!existing) {
    return { error: "Profile not found." };
  }

  const updated = await db
    .update(profiles)
    .set({
      avatarUrl: input.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(profiles.authUserId, input.authUserId))
    .returning();

  const profile = updated[0];
  if (!profile) {
    return { error: "Could not update photo." };
  }
  return { profile };
}
