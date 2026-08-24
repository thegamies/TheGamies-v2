import { describe, expect, it } from "vitest";
import {
  searchTgaCommunityHostMembers,
  tgaStatusSyncsCommunityHosts,
} from "./community-hosts";

describe("tgaStatusSyncsCommunityHosts", () => {
  it("syncs before lock only", () => {
    expect(tgaStatusSyncsCommunityHosts("draft")).toBe(true);
    expect(tgaStatusSyncsCommunityHosts("scheduled")).toBe(true);
    expect(tgaStatusSyncsCommunityHosts("open")).toBe(true);
    expect(tgaStatusSyncsCommunityHosts("locked")).toBe(false);
    expect(tgaStatusSyncsCommunityHosts("off")).toBe(false);
  });
});

describe("searchTgaCommunityHostMembers", () => {
  it("returns no rows for a blank query", async () => {
    await expect(
      searchTgaCommunityHostMembers("community-id", 2026, { q: "" }),
    ).resolves.toEqual([]);
  });
});
