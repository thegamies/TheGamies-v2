import { describe, expect, it } from "vitest";
import { parseOwnedUsername } from "@/lib/profile/username";
import { slugifyCommunityName } from "@/lib/communities/schema";
import {
  PICKEM_SCALE_COMMUNITIES_MAX,
  PICKEM_SCALE_DEFAULT_COMMUNITIES,
  PICKEM_SCALE_DEFAULT_USERS,
  PICKEM_SCALE_EDITION_HOSTS,
  PICKEM_SCALE_NOMINEE_RANK,
  PICKEM_SCALE_USERS_MAX,
  pickemScaleAccount,
  pickemScaleCommunityName,
  pickemScaleCommunitySlug,
  pickemScaleSheetCount,
  parsePickemScaleCommunities,
  parsePickemScaleCount,
  parsePickemScaleUsers,
} from "./pickem-scale";

describe("pickem scale identities", () => {
  it("uses Better Auth emails and valid public handles", () => {
    expect(pickemScaleAccount(1)).toEqual({
      index: 1,
      email: "thegamies-qa-scale-001@example.com",
      username: "gamies_qa_scale_001",
      displayName: "QA Scale 001",
    });
    expect(pickemScaleAccount(50).email).toBe(
      "thegamies-qa-scale-050@example.com",
    );
    expect(parseOwnedUsername(pickemScaleAccount(1).username)).toEqual({
      username: "gamies_qa_scale_001",
    });
    expect(parseOwnedUsername(pickemScaleAccount(50).username)).toEqual({
      username: "gamies_qa_scale_050",
    });
  });

  it("rejects accounts outside the Auth pool", () => {
    expect(() => pickemScaleAccount(0)).toThrow(/1–50/);
    expect(() => pickemScaleAccount(51)).toThrow(/1–50/);
  });

  it("keeps community slugs in the reserved scale prefix", () => {
    expect(pickemScaleCommunitySlug(1)).toBe("seed_pem_0001");
    expect(slugifyCommunityName(pickemScaleCommunityName(1))).toBe(
      "qa_scale_0001",
    );
    expect(pickemScaleCommunitySlug(100).length).toBeLessThanOrEqual(32);
  });
});

describe("parsePickemScale counts", () => {
  it("defaults to 50 Auth users and 50 communities", () => {
    expect(PICKEM_SCALE_DEFAULT_USERS).toBe(50);
    expect(PICKEM_SCALE_DEFAULT_COMMUNITIES).toBe(50);
    expect(PICKEM_SCALE_USERS_MAX).toBe(50);
    expect(PICKEM_SCALE_COMMUNITIES_MAX).toBe(100);
    expect(PICKEM_SCALE_EDITION_HOSTS).toBe(3);
  });

  it("caps users at 50 and communities at 100", () => {
    expect(parsePickemScaleUsers(1)).toBe(1);
    expect(parsePickemScaleUsers(50)).toBe(PICKEM_SCALE_USERS_MAX);
    expect(parsePickemScaleUsers(51)).toHaveProperty("error");
    expect(parsePickemScaleCommunities(100)).toBe(PICKEM_SCALE_COMMUNITIES_MAX);
    expect(parsePickemScaleCommunities(101)).toHaveProperty("error");
    expect(parsePickemScaleCount(50, "Users")).toBe(50);
    expect(parsePickemScaleCount(100, "Communities")).toBe(100);
  });
});

describe("pickem scale nominee rank", () => {
  it("ranks nominees with the voter, the award, and the nominee", () => {
    expect(PICKEM_SCALE_NOMINEE_RANK).toContain("p.id");
    expect(PICKEM_SCALE_NOMINEE_RANK).toContain("c.id");
    expect(PICKEM_SCALE_NOMINEE_RANK).toContain("cn.nominee_id");
  });
});

describe("pickemScaleSheetCount", () => {
  it("is communities times shared users", () => {
    expect(pickemScaleSheetCount(50, 50)).toBe(2_500);
  });
});
