import { describe, expect, it } from "vitest";
import {
  formatScoresVisibleDateInput,
  isCommunityLiveScoresRevealed,
  parseScoresVisibleDateInput,
} from "./live-reveal";
import { sliceLockGotyPage } from "./live-lock";
import { COMMUNITY_MEMBERS_PAGE_SIZE, paginateCommunityMembers } from "./members-page";
import {
  canManageCommunity,
  canSeeCommunityInvite,
  demoteHostBlockedReason,
  leaveBlockedReason,
  setCommunityRoleBlockedReason,
} from "./rules";
import {
  communitySlugSchema,
  communitySlugWithSuffix,
  createCommunitySchema,
  normalizeCommunitySlug,
  parseCreateCommunityInput,
  slugifyCommunityName,
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
    expect(communitySlugSchema.safeParse("join").success).toBe(false);
    expect(communitySlugSchema.safeParse("kf").success).toBe(false);
    expect(communitySlugSchema.safeParse("has-dash").success).toBe(false);
    expect(communitySlugSchema.safeParse("has space").success).toBe(false);
    expect(communitySlugSchema.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("slugifies the community name", () => {
    expect(slugifyCommunityName("  Kinda Funny! ")).toBe("kinda_funny");
    expect(slugifyCommunityName("The Gamies")).toBe("the_gamies");
    expect(slugifyCommunityName("new")).toBe("community");
    expect(slugifyCommunityName("join")).toBe("community");
    expect(slugifyCommunityName("ab")).toBe("community");
    expect(communitySlugWithSuffix("kinda_funny", 2)).toBe("kinda_funny_2");
    expect(communitySlugWithSuffix("a".repeat(32), 2).length).toBe(32);
  });
});

describe("createCommunitySchema", () => {
  it("accepts a named community and derives the slug", () => {
    expect(
      createCommunitySchema.parse({
        name: "  Kinda Funny  ",
        description: "Awards crew.",
      }),
    ).toEqual({
      name: "Kinda Funny",
      description: "Awards crew.",
    });
    expect(
      parseCreateCommunityInput({
        name: "Kinda Funny",
        description: "Awards crew.",
      }),
    ).toEqual({
      slug: "kinda_funny",
      name: "Kinda Funny",
      description: "Awards crew.",
    });
  });

  it("returns a friendly error via parser", () => {
    const emptyName = parseCreateCommunityInput({
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

  it("lets extra admins leave", () => {
    expect(leaveBlockedReason("admin", 2)).toBeNull();
  });

  it("blocks the last admin", () => {
    expect(leaveBlockedReason("admin", 1)).toMatch(/last admin/i);
  });
});

describe("canManageCommunity", () => {
  it("is true only for hosts", () => {
    expect(canManageCommunity("admin")).toBe(true);
    expect(canManageCommunity("member")).toBe(false);
    expect(canManageCommunity(null)).toBe(false);
  });
});

describe("canSeeCommunityInvite", () => {
  it("is only for members when open invites is on", () => {
    expect(canSeeCommunityInvite("member", true)).toBe(true);
    expect(canSeeCommunityInvite("admin", true)).toBe(true);
    expect(canSeeCommunityInvite("member", false)).toBe(false);
    expect(canSeeCommunityInvite("admin", false)).toBe(false);
    expect(canSeeCommunityInvite(null, true)).toBe(false);
  });
});

describe("setCommunityRoleBlockedReason", () => {
  it("blocks non-admins", () => {
    expect(
      setCommunityRoleBlockedReason({
        actorCanManage: false,
        targetIsMember: true,
        targetRole: "member",
        nextRole: "admin",
        hostCount: 1,
      }),
    ).toMatch(/only admins/i);
  });

  it("blocks non-members", () => {
    expect(
      setCommunityRoleBlockedReason({
        actorCanManage: true,
        targetIsMember: false,
        targetRole: "member",
        nextRole: "admin",
        hostCount: 1,
      }),
    ).toMatch(/members/i);
  });

  it("lets admins add another admin", () => {
    expect(
      setCommunityRoleBlockedReason({
        actorCanManage: true,
        targetIsMember: true,
        targetRole: "member",
        nextRole: "admin",
        hostCount: 1,
      }),
    ).toBeNull();
  });

  it("lets extra admins be removed", () => {
    expect(demoteHostBlockedReason(2)).toBeNull();
    expect(
      setCommunityRoleBlockedReason({
        actorCanManage: true,
        targetIsMember: true,
        targetRole: "admin",
        nextRole: "member",
        hostCount: 2,
      }),
    ).toBeNull();
  });

  it("blocks removing the last admin", () => {
    expect(demoteHostBlockedReason(1)).toMatch(/last admin/i);
    expect(
      setCommunityRoleBlockedReason({
        actorCanManage: true,
        targetIsMember: true,
        targetRole: "admin",
        nextRole: "member",
        hostCount: 1,
      }),
    ).toMatch(/last admin/i);
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

describe("sliceLockGotyPage", () => {
  it("pages frozen rows without changing order", () => {
    const rows = [1, 2, 3, 4, 5];
    expect(sliceLockGotyPage(rows, 2, 2)).toEqual({
      page: 2,
      totalPages: 3,
      rows: [3, 4],
    });
    expect(sliceLockGotyPage(rows, 2, 99).page).toBe(3);
  });
});

describe("paginateCommunityMembers", () => {
  it("clamps page and computes offset for SQL LIMIT", () => {
    expect(paginateCommunityMembers(1, 0)).toEqual({
      page: 1,
      offset: 0,
      totalPages: 1,
    });
    expect(paginateCommunityMembers(2, 120)).toEqual({
      page: 2,
      offset: COMMUNITY_MEMBERS_PAGE_SIZE,
      totalPages: 3,
    });
    expect(paginateCommunityMembers(99, 120).page).toBe(3);
    expect(paginateCommunityMembers(0, 10, 10).page).toBe(1);
  });
});
