import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/profile/service";
import { toAccountProfileFormProfile } from "./account-profile-dto";

describe("toAccountProfileFormProfile", () => {
  it("passes only the fields the account form renders", () => {
    const profile = {
      id: "p1",
      authUserId: "auth-secret-id",
      isSiteAdmin: true,
      isSeed: false,
      deletedAt: null,
      avatarUrl: "https://cdn.example/a.png",
      bannerUrl: null,
      bio: "Hi",
      displayName: "Ada",
      socialLinks: { x: "https://x.com/ada" },
      username: "ada",
      usernameChangedAt: null,
      visibility: "public",
    } as unknown as Profile;

    const dto = toAccountProfileFormProfile(profile);
    expect(Object.keys(dto).sort()).toEqual([
      "avatarUrl",
      "bannerUrl",
      "bio",
      "displayName",
      "socialLinks",
      "username",
      "usernameChangedAt",
      "visibility",
    ]);
    expect(JSON.stringify(dto)).not.toContain("auth-secret-id");
    expect(dto).not.toHaveProperty("isSiteAdmin");
  });
});
