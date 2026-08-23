import { describe, expect, it, vi } from "vitest";

vi.mock("@thegamies/db", () => ({
  createDb: vi.fn(),
  communities: {},
  communityMembers: {},
  communityBans: {},
  profiles: {},
}));

import { searchCommunityMembersForAdmin } from "./service";

describe("searchCommunityMembersForAdmin", () => {
  it("returns no hits for a blank query without dumping the roster", async () => {
    await expect(
      searchCommunityMembersForAdmin("community-id", { q: "   " }),
    ).resolves.toEqual([]);
    await expect(
      searchCommunityMembersForAdmin("community-id", { q: "" }),
    ).resolves.toEqual([]);
  });
});
