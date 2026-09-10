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

export const COMMUNITY_VISIBILITIES = ["private", "public"] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const communityVisibilitySchema = z.enum(COMMUNITY_VISIBILITIES);

export function asCommunityVisibility(raw: unknown): CommunityVisibility {
  return raw === "public" ? "public" : "private";
}

export function isCommunityPublic(visibility: string): boolean {
  return visibility === "public";
}

/** Cap for `/communities` featured cards. SQL LIMIT, not a client filter. */
export const FEATURED_COMMUNITIES_LIMIT = 12;

export const COMMUNITY_JOINS_CLOSED_MESSAGE =
  "This community isn’t taking new members.";

/** Members always; non-members only when the community is public. */
export function canBrowseCommunityHome(
  visibility: string,
  viewerRole: CommunityRole | null,
): boolean {
  if (viewerRole) return true;
  return isCommunityPublic(visibility);
}

/**
 * Members always. Guests may open boards only when the community is public
 * and joins are closed (showcase / demo). Regular public communities still
 * keep interiors members-only. Showcase boards include Pick’em standings;
 * Your ballot stays members-only.
 */
export function canBrowseCommunityBoards(
  visibility: string,
  joinsClosed: boolean,
  viewerRole: CommunityRole | null,
): boolean {
  if (viewerRole) return true;
  return isCommunityPublic(visibility) && joinsClosed;
}

export function featuredCommunitySaveBlockedReason(input: {
  featured: boolean;
  visibility: CommunityVisibility;
  alreadyFeatured: boolean;
  featuredCount: number;
}): string | null {
  if (!input.featured) return null;
  if (input.visibility !== "public") {
    return "Only public communities can be featured.";
  }
  if (
    !input.alreadyFeatured &&
    input.featuredCount >= FEATURED_COMMUNITIES_LIMIT
  ) {
    return `Already featuring ${FEATURED_COMMUNITIES_LIMIT} communities.`;
  }
  return null;
}

export function communityLeaveRejoinCopy(
  isPublic: boolean,
  joinsClosed: boolean,
): string {
  if (joinsClosed) {
    return "You will leave this community. You will not be able to rejoin.";
  }
  return isPublic
    ? "You will leave this community. You can join again from this page anytime."
    : "You will leave this community. You can join again later with an invite.";
}

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
  visibility: communityVisibilitySchema.default("private"),
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
    visibility: parsed.data.visibility ?? "private",
    slug: slugifyCommunityName(parsed.data.name),
  };
}
