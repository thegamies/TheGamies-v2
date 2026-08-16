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

  it("allows indices above 1000", () => {
    expect(seedCommunityAuthUserId(1001)).toBe(
      `${SEED_COMMUNITY_AUTH_PREFIX}1001`,
    );
    expect(seedCommunityUsername(2500)).toBe("seedcmem2500");
  });
});
