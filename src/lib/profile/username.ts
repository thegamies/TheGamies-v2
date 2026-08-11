import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

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
