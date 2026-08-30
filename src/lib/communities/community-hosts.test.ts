import { describe, expect, it } from "vitest";
import {
  editionStatusSyncsCommunityHosts,
  searchCommunityMembersForHost,
} from "./community-hosts";

describe("editionStatusSyncsCommunityHosts", () => {
  it("syncs draft and open only", () => {
    expect(editionStatusSyncsCommunityHosts("draft")).toBe(true);
    expect(editionStatusSyncsCommunityHosts("open")).toBe(true);
    expect(editionStatusSyncsCommunityHosts("scheduled")).toBe(false);
    expect(editionStatusSyncsCommunityHosts("closed")).toBe(false);
    expect(editionStatusSyncsCommunityHosts("published")).toBe(false);
  });
});

describe("searchCommunityMembersForHost", () => {
  it("returns no rows for a blank query without hitting membership", async () => {
    await expect(
      searchCommunityMembersForHost("community-id", { q: "   " }),
    ).resolves.toEqual([]);
    await expect(
      searchCommunityMembersForHost("community-id", { q: "" }),
    ).resolves.toEqual([]);
  });
});
