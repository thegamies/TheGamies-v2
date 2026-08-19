import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getProfileByAuthUserId,
  listLastHostCommunityNames,
  verifyAccountPassword,
  deleteAuthenticatedUser,
  purgeAndTombstoneProfile,
  readR2AvatarConfigFromEnv,
} = vi.hoisted(() => ({
  getProfileByAuthUserId: vi.fn(),
  listLastHostCommunityNames: vi.fn(),
  verifyAccountPassword: vi.fn(),
  deleteAuthenticatedUser: vi.fn(),
  purgeAndTombstoneProfile: vi.fn(),
  readR2AvatarConfigFromEnv: vi.fn(),
}));

vi.mock("@/lib/profile/service", () => ({
  getProfileByAuthUserId,
}));

vi.mock("@/lib/profile/delete-account-service", () => ({
  listLastHostCommunityNames,
  purgeAndTombstoneProfile,
}));

vi.mock("@/lib/auth/delete-user", () => ({
  verifyAccountPassword,
  deleteAuthenticatedUser,
}));

vi.mock("@/lib/profile/avatar-upload", () => ({
  readR2AvatarConfigFromEnv,
  deleteUserAvatarObjects: vi.fn(),
}));

import { closeOwnAccount } from "./close-own-account";

describe("closeOwnAccount", () => {
  beforeEach(() => {
    getProfileByAuthUserId.mockReset();
    listLastHostCommunityNames.mockReset();
    verifyAccountPassword.mockReset();
    deleteAuthenticatedUser.mockReset();
    purgeAndTombstoneProfile.mockReset();
    readR2AvatarConfigFromEnv.mockReset();
    readR2AvatarConfigFromEnv.mockReturnValue(null);
  });

  it("requires a password", async () => {
    await expect(
      closeOwnAccount({
        authUserId: "user-1",
        email: "ada@example.com",
        password: "",
      }),
    ).resolves.toEqual({
      error: "Enter your password to delete your account.",
    });
  });

  it("blocks the last host before closing Auth", async () => {
    getProfileByAuthUserId.mockResolvedValueOnce({ id: "p1" });
    listLastHostCommunityNames.mockResolvedValueOnce(["Kinda Funny"]);

    await expect(
      closeOwnAccount({
        authUserId: "user-1",
        email: "ada@example.com",
        password: "secret",
      }),
    ).resolves.toMatchObject({
      error: expect.stringContaining("Kinda Funny"),
    });
    expect(deleteAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("closes Auth then tombs the profile", async () => {
    getProfileByAuthUserId.mockResolvedValueOnce({ id: "p1" });
    listLastHostCommunityNames.mockResolvedValueOnce([]);
    verifyAccountPassword.mockResolvedValueOnce({ ok: true });
    deleteAuthenticatedUser.mockResolvedValueOnce({ ok: true });
    purgeAndTombstoneProfile.mockResolvedValueOnce({ ok: true });

    await expect(
      closeOwnAccount({
        authUserId: "user-1",
        email: "ada@example.com",
        password: "secret",
      }),
    ).resolves.toEqual({ ok: true });
    expect(deleteAuthenticatedUser).toHaveBeenCalledWith({
      password: "secret",
      authUserId: "user-1",
      email: "ada@example.com",
    });
    expect(purgeAndTombstoneProfile).toHaveBeenCalledWith("p1");
  });
});
