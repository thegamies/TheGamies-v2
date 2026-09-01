import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const ensureProfileForAuthUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

vi.mock("@/lib/profile/service", () => ({
  ensureProfileForAuthUser: (...args: unknown[]) =>
    ensureProfileForAuthUser(...args),
}));

import { completeGoogleProfile } from "./actions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("completeGoogleProfile", () => {
  beforeEach(() => {
    getSession.mockReset();
    ensureProfileForAuthUser.mockReset();
    redirect.mockClear();
  });

  it("creates a profile then continues", async () => {
    getSession.mockResolvedValueOnce({
      data: {
        user: {
          id: "user-1",
          name: "Ada Lovelace",
          image: "https://lh3.googleusercontent.com/a",
        },
      },
    });
    ensureProfileForAuthUser.mockResolvedValueOnce({
      profile: { id: "p1" },
      created: true,
    });

    await expect(
      completeGoogleProfile(
        null,
        form({
          displayName: "Ada",
          username: "ada",
          next: "/create/goty",
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/create\/goty/);
    expect(ensureProfileForAuthUser).toHaveBeenCalledWith({
      authUserId: "user-1",
      username: "ada",
      displayName: "Ada",
      avatarUrl: "https://lh3.googleusercontent.com/a",
    });
  });

  it("returns username conflicts on the form", async () => {
    getSession.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
    });
    ensureProfileForAuthUser.mockResolvedValueOnce({
      error: "That username is not available.",
    });

    await expect(
      completeGoogleProfile(
        null,
        form({ displayName: "Ada", username: "taken" }),
      ),
    ).resolves.toEqual({ error: "That username is not available." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends signed-out visitors to sign in with next", async () => {
    getSession.mockResolvedValueOnce({ data: null });
    await expect(
      completeGoogleProfile(
        null,
        form({
          displayName: "Ada",
          username: "ada",
          next: "/create/goty",
        }),
      ),
    ).rejects.toThrow(/REDIRECT:\/auth\/sign-in\?next=/);
  });
});
