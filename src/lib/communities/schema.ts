import { z } from "zod";

export const COMMUNITY_SLUG_MIN = 3;
export const COMMUNITY_SLUG_MAX = 32;
export const COMMUNITY_NAME_MAX = 80;
export const COMMUNITY_DESCRIPTION_MAX = 500;

/** Reserved so `/communities/new` is never a community slug. */
export const RESERVED_COMMUNITY_SLUGS = new Set(["new"]);

export const COMMUNITY_ROLES = ["admin", "member"] as const;
export type CommunityRole = (typeof COMMUNITY_ROLES)[number];

export function normalizeCommunitySlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export const communitySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(COMMUNITY_SLUG_MIN)
  .max(COMMUNITY_SLUG_MAX)
  .regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores only")
  .refine((slug) => !RESERVED_COMMUNITY_SLUGS.has(slug), {
    message: "That slug is reserved.",
  });

export const communityNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(COMMUNITY_NAME_MAX);

export const communityDescriptionSchema = z
  .string()
  .trim()
  .max(COMMUNITY_DESCRIPTION_MAX);

export const createCommunitySchema = z.object({
  slug: communitySlugSchema,
  name: communityNameSchema,
  description: communityDescriptionSchema.optional().or(z.literal("")),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export function parseCreateCommunityInput(
  input: unknown,
): CreateCommunityInput | { error: string } {
  const parsed = createCommunitySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Check the community details." };
  }
  return parsed.data;
}
