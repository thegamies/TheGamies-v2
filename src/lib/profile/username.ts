import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_CHANGE_COOLDOWN_MS =
  USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export const USERNAME_NOT_AVAILABLE = "That username is not available.";
export const USERNAME_COOLDOWN_MESSAGE =
  "You can only change your username once every 30 days.";
export const USERNAME_FORMAT_MESSAGE =
  "Choose a username with 3–24 letters, numbers, or underscores.";

/**
 * First-path segments and identity words that must not be public handles.
 * Keep in app code only — do not duplicate in SQL.
 */
export const RESERVED_USERNAMES = new Set([
  "account",
  "admin",
  "auth",
  "about",
  "api",
  "contact",
  "create",
  "communities",
  "community",
  "dev",
  "design-system",
  "game",
  "games",
  "guidelines",
  "help",
  "l",
  "lists",
  "login",
  "me",
  "privacy",
  "settings",
  "standings",
  "support",
  "terms",
  "u",
  "www",
  "you",
  "null",
  "undefined",
]);

/** Lowercase letters, numbers, underscore; 3–24 chars. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN)
  .max(USERNAME_MAX)
  .regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores only");

export const displayNameSchema = z.string().trim().min(1).max(80);

export const bioSchema = z.string().trim().max(500).optional().or(z.literal(""));

export const visibilitySchema = z.enum(["public", "private"]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  return usernameSchema.safeParse(raw).success;
}

export function isReservedUsername(raw: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(raw));
}

/** Next time a rename is allowed, or null if it can happen now. */
export function nextUsernameChangeAllowedAt(
  usernameChangedAt: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (!usernameChangedAt) return null;
  const next = new Date(
    usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS,
  );
  return now >= next ? null : next;
}

export function canChangeUsername(
  usernameChangedAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return nextUsernameChangeAllowedAt(usernameChangedAt, now) === null;
}

export function formatUsernameChangeAllowedOn(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function parseOwnedUsername(
  raw: string,
): { username: string } | { error: string } {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: USERNAME_FORMAT_MESSAGE };
  }
  if (isReservedUsername(parsed.data)) {
    return { error: USERNAME_NOT_AVAILABLE };
  }
  return { username: parsed.data };
}
