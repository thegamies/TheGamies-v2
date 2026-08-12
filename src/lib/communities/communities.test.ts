import { describe, expect, it } from "vitest";
import { leaveBlockedReason } from "./rules";
import {
  communitySlugSchema,
  createCommunitySchema,
  normalizeCommunitySlug,
  parseCreateCommunityInput,
} from "./schema";

describe("community slug", () => {
  it("normalizes case and trim", () => {
    expect(normalizeCommunitySlug("  Kinda_Funny  ")).toBe("kinda_funny");
  });

  it("accepts valid slugs", () => {
    expect(communitySlugSchema.parse("kinda_funny")).toBe("kinda_funny");
    expect(communitySlugSchema.parse("A_Crew99")).toBe("a_crew99");
  });

  it("rejects reserved and invalid slugs", () => {
    expect(communitySlugSchema.safeParse("new").success).toBe(false);
    expect(communitySlugSchema.safeParse("kf").success).toBe(false);
    expect(communitySlugSchema.safeParse("has-dash").success).toBe(false);
    expect(communitySlugSchema.safeParse("has space").success).toBe(false);
    expect(communitySlugSchema.safeParse("a".repeat(33)).success).toBe(false);
  });
});

describe("createCommunitySchema", () => {
  it("accepts a named community", () => {
    expect(
      createCommunitySchema.parse({
        slug: "Kinda_Funny",
        name: "  Kinda Funny  ",
        description: "Awards crew.",
      }),
    ).toEqual({
      slug: "kinda_funny",
      name: "Kinda Funny",
      description: "Awards crew.",
    });
  });

  it("returns a friendly error via parser", () => {
    const reserved = parseCreateCommunityInput({ slug: "new", name: "Crew" });
    expect("error" in reserved).toBe(true);
    const emptyName = parseCreateCommunityInput({
      slug: "ok_slug",
      name: "",
    });
    expect("error" in emptyName).toBe(true);
  });
});

describe("leaveBlockedReason", () => {
  it("lets members leave", () => {
    expect(leaveBlockedReason("member", 1)).toBeNull();
    expect(leaveBlockedReason("member", 0)).toBeNull();
  });

  it("lets extra hosts leave", () => {
    expect(leaveBlockedReason("admin", 2)).toBeNull();
  });

  it("blocks the last host", () => {
    expect(leaveBlockedReason("admin", 1)).toMatch(/last host/i);
  });
});
