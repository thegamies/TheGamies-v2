import { describe, expect, it } from "vitest";
import { parseOwnedUsername } from "@/lib/profile/username";
import { slugifyCommunityName } from "@/lib/communities/schema";
import {
  PICKEM_SCALE_MAX,
  pickemScaleAuthBounds,
  pickemScaleAuthUserId,
  pickemScaleCommunityName,
  pickemScaleCommunitySlug,
  pickemScaleDisplayName,
  pickemScaleSheetCount,
  pickemScaleUsername,
  parsePickemScaleCount,
} from "./pickem-scale";

describe("pickem scale identities", () => {
  it("uses seed auth ids and valid public handles", () => {
    expect(pickemScaleAuthUserId(1)).toBe("seed:pickemscale:0001");
    expect(pickemScaleAuthUserId(1000)).toBe("seed:pickemscale:1000");
    expect(parseOwnedUsername(pickemScaleUsername(1))).toEqual({
      username: "seedpmu0001",
    });
    expect(parseOwnedUsername(pickemScaleUsername(1000))).toEqual({
      username: "seedpmu1000",
    });
    expect(pickemScaleDisplayName(7)).toBe("Pickem Scale 0007");
  });

  it("keeps community slugs in the reserved scale prefix", () => {
    expect(pickemScaleCommunitySlug(1)).toBe("seed_pem_0001");
    expect(slugifyCommunityName(pickemScaleCommunityName(1))).toBe(
      "pickem_scale_0001",
    );
    expect(pickemScaleCommunitySlug(1000).length).toBeLessThanOrEqual(32);
  });

  it("orders auth ids so BETWEEN covers the first N users", () => {
    const bounds = pickemScaleAuthBounds(1000);
    expect(bounds.first < bounds.last).toBe(true);
    expect(pickemScaleAuthUserId(2) > bounds.first).toBe(true);
    expect(pickemScaleAuthUserId(1000) <= bounds.last).toBe(true);
  });
});

describe("parsePickemScaleCount", () => {
  it("caps at 1000", () => {
    expect(parsePickemScaleCount(1, "Users")).toBe(1);
    expect(parsePickemScaleCount(1000, "Users")).toBe(PICKEM_SCALE_MAX);
    expect(parsePickemScaleCount(0, "Users")).toHaveProperty("error");
    expect(parsePickemScaleCount(1001, "Communities")).toHaveProperty("error");
  });
});

describe("pickemScaleSheetCount", () => {
  it("is communities times shared users", () => {
    expect(pickemScaleSheetCount(1000, 1000)).toBe(1_000_000);
  });
});
