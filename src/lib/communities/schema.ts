import { z } from "zod";

export const COMMUNITY_SLUG_MIN = 3;
export const COMMUNITY_SLUG_MAX = 32;
export const COMMUNITY_NAME_MAX = 80;
export const COMMUNITY_DESCRIPTION_MAX = 500;
const COMMUNITY_SLUG_FALLBACK = "community";

/** Reserved so `/communities/new` and `/communities/join` are never slugs. */
export const RESERVED_COMMUNITY_SLUGS = new Set(["new", "join"]);

export const COMMUNITY_ROLES = ["admin", "member"] as const;
export type CommunityRole = (typeof COMMUNITY_ROLES)[number];

export function normalizeCommunitySlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/** URL slug from a community name (`kinda_funny`). Not shown as a form field. */
export function slugifyCommunityName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, COMMUNITY_SLUG_MAX);
  if (
    base.length < COMMUNITY_SLUG_MIN ||
    RESERVED_COMMUNITY_SLUGS.has(base)
  ) {
    return COMMUNITY_SLUG_FALLBACK;
  }
  return base;
}

export function communitySlugWithSuffix(base: string, n: number): string {
  if (n <= 1) return base.slice(0, COMMUNITY_SLUG_MAX);
  const suffix = `_${n}`;
  const maxBase = Math.max(COMMUNITY_SLUG_MIN, COMMUNITY_SLUG_MAX - suffix.length);
  return `${base.slice(0, maxBase)}${suffix}`.slice(0, COMMUNITY_SLUG_MAX);
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
  name: communityNameSchema,
  description: communityDescriptionSchema.optional().or(z.literal("")),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema> & {
  slug: string;
};

export function parseCreateCommunityInput(
  input: unknown,
): CreateCommunityInput | { error: string } {
  const parsed = createCommunitySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Check the community details." };
  }
  return {
    ...parsed.data,
    slug: slugifyCommunityName(parsed.data.name),
  };
}
