import { describe, expect, it } from "vitest";
import { searchEditionHostMembers } from "./voices";

describe("searchEditionHostMembers", () => {
  it("returns no rows for a blank query without hitting membership", async () => {
    await expect(
      searchEditionHostMembers("community-id", "edition-id", { q: "   " }),
    ).resolves.toEqual([]);
    await expect(
      searchEditionHostMembers("community-id", "edition-id", { q: "" }),
    ).resolves.toEqual([]);
  });
});
