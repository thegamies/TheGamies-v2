import { eq } from "drizzle-orm";
import { createDb, profiles, type Db } from "@thegamies/db";
import {
  displayNameSchema,
  normalizeUsername,
  usernameSchema,
} from "@/lib/profile/username";

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
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProfileByUsername(
  username: string,
  db: Db = getDb(),
): Promise<Profile | null> {
  const normalized = normalizeUsername(username);
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function usernameTaken(
  username: string,
  exceptAuthUserId?: string,
  db: Db = getDb(),
): Promise<boolean> {
  const existing = await getProfileByUsername(username, db);
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
  const usernameParsed = usernameSchema.safeParse(input.username);
  if (!usernameParsed.success) {
    return { error: "Choose a username with 3–24 letters, numbers, or underscores." };
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

  if (await usernameTaken(usernameParsed.data, undefined, db)) {
    return { error: "That username is taken." };
  }

  const inserted = await db
    .insert(profiles)
    .values({
      authUserId: input.authUserId,
      username: usernameParsed.data,
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
}): Promise<{ profile: Profile } | { error: string }> {
  const usernameParsed = usernameSchema.safeParse(input.username);
  if (!usernameParsed.success) {
    return { error: "Choose a username with 3–24 letters, numbers, or underscores." };
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

  if (await usernameTaken(usernameParsed.data, input.authUserId, db)) {
    return { error: "That username is taken." };
  }

  const updated = await db
    .update(profiles)
    .set({
      username: usernameParsed.data,
      displayName: displayParsed.data,
      bio: input.bio?.trim() ? input.bio.trim() : null,
      visibility: input.visibility,
      updatedAt: new Date(),
    })
    .where(eq(profiles.authUserId, input.authUserId))
    .returning();

  const profile = updated[0];
  if (!profile) {
    return { error: "Could not update profile." };
  }
  return { profile };
}
