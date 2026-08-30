import { describe, expect, it } from "vitest";
import {
  editionVoicesWriteBlockedReason,
  searchEditionHostMembers,
} from "./voices";

describe("editionVoicesWriteBlockedReason", () => {
  it("allows writes after close and publish", () => {
    expect(editionVoicesWriteBlockedReason("open")).toBeNull();
    expect(editionVoicesWriteBlockedReason("closed")).toBeNull();
    expect(editionVoicesWriteBlockedReason("published")).toBeNull();
  });
});

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
