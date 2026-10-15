import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestSessionUser = vi.fn();
const getRequestProfileByAuthUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getRequestSessionUser: () => getRequestSessionUser(),
  getRequestProfileByAuthUserId: (...args: unknown[]) =>
    getRequestProfileByAuthUserId(...args),
}));

import { resumeAfterGoogleSignIn } from "./resume-after-google";

describe("resumeAfterGoogleSignIn", () => {
  beforeEach(() => {
    getRequestSessionUser.mockReset();
    getRequestProfileByAuthUserId.mockReset();
  });

  it("returns to the page they left when the profile already exists", async () => {
    getRequestSessionUser.mockResolvedValueOnce({ id: "user-1" });
    getRequestProfileByAuthUserId.mockResolvedValueOnce({ id: "profile-1" });

    await expect(resumeAfterGoogleSignIn("/games")).resolves.toEqual({
      href: "/games",
    });
  });

  it("stops to choose a name when this Google account is new", async () => {
    getRequestSessionUser.mockResolvedValueOnce({ id: "user-1" });
    getRequestProfileByAuthUserId.mockResolvedValueOnce(null);

    await expect(resumeAfterGoogleSignIn("/games")).resolves.toEqual({
      href: "/auth/complete-profile?next=%2Fgames",
    });
  });

  it("still returns them when the session is not visible yet", async () => {
    getRequestSessionUser.mockResolvedValueOnce(null);

    await expect(resumeAfterGoogleSignIn("/u/ada")).resolves.toEqual({
      href: "/u/ada",
    });
    expect(getRequestProfileByAuthUserId).not.toHaveBeenCalled();
  });
});
