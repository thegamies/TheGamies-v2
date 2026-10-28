import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteUser, removeSelfHostedAuthUser, headerStore } = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  removeSelfHostedAuthUser: vi.fn(),
  headerStore: new Headers({
    origin: "http://localhost:3000",
    cookie: "session=test",
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => headerStore,
}));

vi.mock("@/lib/auth/server", () => ({
  getAuth: () => ({
    deleteUser,
  }),
}));

vi.mock("./remove-self-hosted-auth-user", () => ({
  removeSelfHostedAuthUser,
}));

import {
  deleteAuthenticatedUser,
  verifyAccountPassword,
} from "./delete-user";

describe("deleteAuthenticatedUser", () => {
  beforeEach(() => {
    deleteUser.mockReset();
    removeSelfHostedAuthUser.mockReset();
    removeSelfHostedAuthUser.mockResolvedValue(false);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  it("still removes the auth_* row when the SDK reports success", async () => {
    deleteUser.mockResolvedValueOnce({ error: null });
    removeSelfHostedAuthUser.mockResolvedValueOnce(true);
    await expect(
      deleteAuthenticatedUser({
        password: "secret",
        authUserId: "user-1",
        email: "a@b.c",
      }),
    ).resolves.toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith({ password: "secret" });
    expect(removeSelfHostedAuthUser).toHaveBeenCalledWith("user-1", {
      email: "a@b.c",
    });
  });

  it("returns an error when the sign-in user cannot be closed", async () => {
    deleteUser.mockResolvedValueOnce({ error: { message: "not enabled" } });
    await expect(
      deleteAuthenticatedUser({ password: "secret", authUserId: "user-1" }),
    ).resolves.toEqual({
      error: "Could not close the sign-in for this account.",
    });
  });

  it("closes via auth_* SQL", async () => {
    deleteUser.mockResolvedValueOnce({ error: null });
    removeSelfHostedAuthUser.mockResolvedValueOnce(true);
    await expect(
      deleteAuthenticatedUser({
        password: "secret",
        authUserId: "user-1",
        email: "a@b.c",
      }),
    ).resolves.toEqual({ ok: true });
    expect(removeSelfHostedAuthUser).toHaveBeenCalledWith("user-1", {
      email: "a@b.c",
    });
  });
});

describe("verifyAccountPassword", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BETTER_AUTH_URL", "https://app.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example");
  });

  it("checks the password without rotating the app session cookie", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "session" }),
    });
    await expect(
      verifyAccountPassword({ email: "a@b.c", password: "secret" }),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/auth/sign-in/email", "https://app.example"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Origin: "http://localhost:3000",
        }),
      }),
    );
  });

  it("rejects a bad password", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid password" }),
    });
    await expect(
      verifyAccountPassword({ email: "a@b.c", password: "nope" }),
    ).resolves.toEqual({ error: "That password is incorrect." });
  });
});
