import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteUser,
  removeNeonAuthDirectoryUser,
  removeSelfHostedAuthUser,
  deleteNeonAuthUserViaApi,
  headerStore,
} = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  removeNeonAuthDirectoryUser: vi.fn(),
  removeSelfHostedAuthUser: vi.fn(),
  deleteNeonAuthUserViaApi: vi.fn(),
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

vi.mock("./remove-neon-auth-user", () => ({
  removeNeonAuthDirectoryUser,
}));

vi.mock("./remove-self-hosted-auth-user", () => ({
  removeSelfHostedAuthUser,
}));

vi.mock("./neon-auth-directory", () => ({
  deleteNeonAuthUserViaApi,
}));

import {
  deleteAuthenticatedUser,
  verifyAccountPassword,
} from "./delete-user";

describe("deleteAuthenticatedUser", () => {
  beforeEach(() => {
    deleteUser.mockReset();
    removeNeonAuthDirectoryUser.mockReset();
    removeSelfHostedAuthUser.mockReset();
    deleteNeonAuthUserViaApi.mockReset();
    deleteNeonAuthUserViaApi.mockResolvedValue(false);
    removeNeonAuthDirectoryUser.mockResolvedValue(false);
    removeSelfHostedAuthUser.mockResolvedValue(false);
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
  });


  it("still removes the directory row when the SDK reports success", async () => {
    deleteUser.mockResolvedValueOnce({ error: null });
    removeNeonAuthDirectoryUser.mockResolvedValueOnce(true);
    await expect(
      deleteAuthenticatedUser({
        password: "secret",
        authUserId: "user-1",
        email: "a@b.c",
      }),
    ).resolves.toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith({ password: "secret" });
    expect(removeNeonAuthDirectoryUser).toHaveBeenCalledWith("user-1", {
      email: "a@b.c",
    });
  });

  it("closes the user through the Neon Auth Users API", async () => {
    deleteUser.mockResolvedValueOnce({ error: { message: "not enabled" } });
    deleteNeonAuthUserViaApi.mockResolvedValueOnce(true);
    await expect(
      deleteAuthenticatedUser({ password: "secret", authUserId: "user-1" }),
    ).resolves.toEqual({ ok: true });
    expect(deleteNeonAuthUserViaApi).toHaveBeenCalledWith("user-1");
  });

  it("returns an error when the sign-in user cannot be closed", async () => {
    deleteUser.mockResolvedValueOnce({ error: { message: "not enabled" } });
    await expect(
      deleteAuthenticatedUser({ password: "secret", authUserId: "user-1" }),
    ).resolves.toEqual({
      error: "Could not close the sign-in for this account.",
    });
  });

  it("closes via auth_* SQL when self-hosted", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("DATABASE_URL", "postgres://example");
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
    expect(removeNeonAuthDirectoryUser).not.toHaveBeenCalled();
    expect(deleteNeonAuthUserViaApi).not.toHaveBeenCalled();
  });
});

describe("verifyAccountPassword", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example/neondb/auth/");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
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
      new URL("sign-in/email", "https://auth.example/neondb/auth/"),
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
