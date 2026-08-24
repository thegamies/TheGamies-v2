import { describe, expect, it, vi } from "vitest";

vi.mock("@thegamies/db", () => ({
  createDb: vi.fn(),
  profiles: {},
}));

import { searchProfilesForSiteOps } from "./service";

describe("searchProfilesForSiteOps", () => {
  it("returns no hits for a blank query without dumping profiles", async () => {
    await expect(searchProfilesForSiteOps("   ")).resolves.toEqual([]);
    await expect(searchProfilesForSiteOps("")).resolves.toEqual([]);
  });
});
