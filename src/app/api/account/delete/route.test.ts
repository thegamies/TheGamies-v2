import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, closeOwnAccount } = vi.hoisted(() => ({
  getSession: vi.fn(),
  closeOwnAccount: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: (...args: unknown[]) => getSession(...args),
  },
}));

vi.mock("@/lib/profile/close-own-account", () => ({
  closeOwnAccount: (...args: unknown[]) => closeOwnAccount(...args),
}));

import { POST } from "./route";

function post(body: FormData, origin = "https://thegamies.gg") {
  return POST(
    new Request("https://thegamies.gg/api/account/delete", {
      method: "POST",
      headers: {
        origin,
        host: "thegamies.gg",
        cookie: "better-auth.session_token=abc; tg_list_edit=keep",
      },
      body,
    }),
  );
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    getSession.mockReset();
    closeOwnAccount.mockReset();
  });

  it("rejects a cross-origin post", async () => {
    const data = new FormData();
    data.set("password", "secret");
    const response = await post(data, "https://evil.example");
    expect(response.status).toBe(403);
    expect(closeOwnAccount).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    getSession.mockResolvedValueOnce({ data: null });
    const data = new FormData();
    data.set("password", "secret");
    const response = await post(data);
    expect(response.status).toBe(401);
    expect(closeOwnAccount).not.toHaveBeenCalled();
  });

  it("returns form errors without leaving the page", async () => {
    getSession.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "ada@example.com" } },
    });
    closeOwnAccount.mockResolvedValueOnce({
      error: "That password is incorrect.",
    });
    const data = new FormData();
    data.set("password", "nope");
    const response = await post(data);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "That password is incorrect.",
    });
  });

  it("closes the account and expires the session cookie", async () => {
    getSession.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "ada@example.com" } },
    });
    closeOwnAccount.mockResolvedValueOnce({ ok: true });
    const data = new FormData();
    data.set("password", "secret");
    const response = await post(data);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    const setCookie = response.headers.getSetCookie?.() ?? [
      response.headers.get("set-cookie") ?? "",
    ];
    expect(setCookie.join("\n")).toMatch(/better-auth\.session_token=/);
    expect(setCookie.join("\n")).not.toMatch(/tg_list_edit=/);
  });
});
