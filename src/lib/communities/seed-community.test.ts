import { describe, expect, it } from "vitest";
import {
  SEED_COMMUNITY_AUTH_PREFIX,
  SEED_COMMUNITY_MAX_BATCH,
  resolveCommunitySeedStartIndex,
  seedCommunityAuthUserId,
  seedCommunityDisplayName,
  seedCommunityUsername,
} from "./seed-community";

describe("community seed ids", () => {
  it("pads auth and username indices", () => {
    expect(seedCommunityAuthUserId(7)).toBe(`${SEED_COMMUNITY_AUTH_PREFIX}0007`);
    expect(seedCommunityUsername(7)).toBe("seedcmem007");
    expect(seedCommunityDisplayName(7, false)).toBe("Seed Member 007");
    expect(seedCommunityDisplayName(1, true)).toBe("Seed Host 001");
  });

  it("allows indices above 1000", () => {
    expect(seedCommunityAuthUserId(1001)).toBe(
      `${SEED_COMMUNITY_AUTH_PREFIX}1001`,
    );
    expect(seedCommunityUsername(2500)).toBe("seedcmem2500");
  });
});

describe("community seed batch", () => {
  it("caps each server request at 50 members", () => {
    expect(SEED_COMMUNITY_MAX_BATCH).toBe(50);
  });
});

describe("resolveCommunitySeedStartIndex", () => {
  it("reseeds from index 1", () => {
    expect(resolveCommunitySeedStartIndex({ reseed: true, maxIndex: 50 })).toBe(
      1,
    );
    expect(resolveCommunitySeedStartIndex({ reseed: true, maxIndex: 0 })).toBe(
      1,
    );
  });

  it("appends after the highest seed when reseed is off", () => {
    expect(resolveCommunitySeedStartIndex({ reseed: false, maxIndex: 0 })).toBe(
      1,
    );
    expect(resolveCommunitySeedStartIndex({ reseed: false, maxIndex: 50 })).toBe(
      51,
    );
    expect(
      resolveCommunitySeedStartIndex({ reseed: false, maxIndex: 1000 }),
    ).toBe(1001);
  });
});
