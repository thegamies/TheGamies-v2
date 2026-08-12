import { describe, expect, it } from "vitest";
import {
  SEED_COMMUNITY_AUTH_PREFIX,
  seedCommunityAuthUserId,
  seedCommunityUsername,
} from "./seed-community";

describe("community seed ids", () => {
  it("pads auth and username indices", () => {
    expect(seedCommunityAuthUserId(7)).toBe(`${SEED_COMMUNITY_AUTH_PREFIX}0007`);
    expect(seedCommunityUsername(7)).toBe("seedcmem007");
  });
});
