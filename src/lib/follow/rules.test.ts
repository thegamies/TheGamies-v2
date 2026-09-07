import { describe, expect, it } from "vitest";
import { allowFollowSeedAccounts, followDeniedReason } from "./rules";

describe("followDeniedReason", () => {
  const publicTarget = {
    id: "p2",
    visibility: "public",
    deletedAt: null,
    isSeed: false,
  };

  it("blocks self-follow, private profiles, and seed accounts", () => {
    expect(followDeniedReason("p2", publicTarget)).toBe(
      "You cannot follow yourself.",
    );
    expect(
      followDeniedReason("p1", { ...publicTarget, visibility: "private" }),
    ).toBe("You can only follow public profiles.");
    expect(
      followDeniedReason("p1", { ...publicTarget, deletedAt: new Date() }),
    ).toBe("Profile not found.");
    expect(followDeniedReason("p1", { ...publicTarget, isSeed: true })).toBe(
      "This profile cannot be followed.",
    );
  });

  it("allows following seed accounts for operators and debug builds", () => {
    expect(
      followDeniedReason(
        "p1",
        { ...publicTarget, isSeed: true },
        { allowSeedFollow: true },
      ),
    ).toBeNull();
    expect(
      followDeniedReason(
        "p1",
        { ...publicTarget, isSeed: true, visibility: "private" },
        { allowSeedFollow: true },
      ),
    ).toBe("You can only follow public profiles.");
  });

  it("allows following another public profile", () => {
    expect(followDeniedReason("p1", publicTarget)).toBeNull();
  });
});

describe("allowFollowSeedAccounts", () => {
  it("allows site operators on any host", () => {
    expect(allowFollowSeedAccounts({ isSiteAdmin: true })).toBe(true);
  });
});
