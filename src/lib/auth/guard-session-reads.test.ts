import { describe, expect, it, vi } from "vitest";
import { guardSessionReads } from "@/lib/auth/guard-session-reads";
import { SESSION_TOKEN_COOKIE_NAME } from "@/lib/auth/session-cache-cookie";

describe("guardSessionReads", () => {
  it("does not call Neon when the request has no session token", async () => {
    const getSession = vi.fn();
    const auth = guardSessionReads({ getSession }, async () => ({
      cookieHeader: "theme=paper",
      clientIp: "203.0.113.8",
    }));
    await expect(auth.getSession()).resolves.toEqual({ data: null, error: null });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("shares one upstream read for the same session token", async () => {
    let release: (value: { data: { user: { id: string } }; error: null }) => void =
      () => {};
    const getSession = vi.fn(
      () =>
        new Promise<{ data: { user: { id: string } }; error: null }>((resolve) => {
          release = resolve;
        }),
    );
    const auth = guardSessionReads({ getSession }, async () => ({
      cookieHeader: `${SESSION_TOKEN_COOKIE_NAME}=tok`,
      clientIp: null,
    }));
    const first = auth.getSession();
    const second = auth.getSession();
    await vi.waitFor(() => expect(getSession).toHaveBeenCalledOnce());
    release({ data: { user: { id: "u1" } }, error: null });
    await expect(first).resolves.toEqual({ data: { user: { id: "u1" } }, error: null });
    await expect(second).resolves.toEqual({ data: { user: { id: "u1" } }, error: null });
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("still calls Neon when the cookie header cannot be read", async () => {
    const getSession = vi.fn().mockResolvedValue({ data: null, error: null });
    const auth = guardSessionReads({ getSession }, async () => ({
      cookieHeader: null,
      clientIp: null,
    }));
    await auth.getSession();
    expect(getSession).toHaveBeenCalledOnce();
  });
});
