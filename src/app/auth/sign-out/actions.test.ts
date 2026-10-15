import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const cookieSet = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: {
    signOut: () => signOut(),
  },
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      cookie:
        "__Secure-neon-auth.session_token=tok; __Secure-neon-auth.local.session_data=cache; tg_list_edit=keep",
    }),
  cookies: async () => ({
    set: (...args: unknown[]) => cookieSet(...args),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));

import { signOutAction } from "./actions";

describe("signOutAction", () => {
  beforeEach(() => {
    signOut.mockReset();
    cookieSet.mockReset();
    signOut.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("drops the local session cookies and returns home", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(signOut).toHaveBeenCalledOnce();
    const names = cookieSet.mock.calls.map((call) => call[0]);
    expect(names).toEqual([
      "__Secure-neon-auth.session_token",
      "__Secure-neon-auth.local.session_data",
    ]);
    expect(cookieSet.mock.calls.every((call) => call[2]?.maxAge === 0)).toBe(
      true,
    );
  });

  it("still drops the local session when Auth sign-out fails", async () => {
    signOut.mockRejectedValueOnce(new Error("upstream"));
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(cookieSet).toHaveBeenCalled();
  });
});
