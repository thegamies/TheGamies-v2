import { describe, expect, it } from "vitest";
import {
  formatScoresVisibleDateInput,
  isCommunityLiveScoresRevealed,
  parseScoresVisibleDateInput,
} from "./live-reveal";
import { canManageCommunity, leaveBlockedReason } from "./rules";
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

describe("canManageCommunity", () => {
  it("is true only for hosts", () => {
    expect(canManageCommunity("admin")).toBe(true);
    expect(canManageCommunity("member")).toBe(false);
    expect(canManageCommunity(null)).toBe(false);
  });
});

describe("isCommunityLiveScoresRevealed", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("hides all years when no date is set", () => {
    expect(isCommunityLiveScoresRevealed(null, { now })).toBe(false);
  });

  it("hides until the date is reached", () => {
    expect(
      isCommunityLiveScoresRevealed(new Date("2026-07-01T00:00:00.000Z"), {
        now,
      }),
    ).toBe(false);
    expect(
      isCommunityLiveScoresRevealed(new Date("2026-06-01T00:00:00.000Z"), {
        now,
      }),
    ).toBe(true);
  });
});

describe("parseScoresVisibleDateInput", () => {
  it("parses YYYY-MM-DD as UTC midnight", () => {
    const parsed = parseScoresVisibleDateInput("2026-12-15");
    expect(parsed).toEqual({
      ok: true,
      date: new Date("2026-12-15T00:00:00.000Z"),
    });
  });

  it("rejects invalid values", () => {
    expect(parseScoresVisibleDateInput("")).toEqual({
      error: "Pick a valid date.",
    });
    expect(parseScoresVisibleDateInput("12/15/2026")).toEqual({
      error: "Pick a valid date.",
    });
  });

  it("round-trips format helper", () => {
    expect(
      formatScoresVisibleDateInput(new Date("2026-12-15T00:00:00.000Z")),
    ).toBe("2026-12-15");
    expect(formatScoresVisibleDateInput(null)).toBe("");
  });
});
