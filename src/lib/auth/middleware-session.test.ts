import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthOrNull = vi.fn(() => null as null | {
  middleware: (opts: { loginUrl: string }) => (
    request: NextRequest,
  ) => Response | Promise<Response>;
});

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => getAuthOrNull(),
}));

import { middleware } from "../../../middleware";

describe("middleware account gate", () => {
  beforeEach(() => {
    getAuthOrNull.mockReset();
    getAuthOrNull.mockReturnValue(null);
  });

  it("passes public navigations without requiring auth", async () => {
    const response = await middleware(
      new NextRequest("https://thegamies.gg/games", {
        headers: { cookie: "session=old" },
      }),
    );
    expect(response.status).toBe(200);
    expect(getAuthOrNull).not.toHaveBeenCalled();
  });

  it("skips the account redirect when auth is not configured", async () => {
    const response = await middleware(
      new NextRequest("https://thegamies.gg/account"),
    );
    expect(response.status).toBe(200);
    expect(getAuthOrNull).toHaveBeenCalledOnce();
  });

  it("redirects unsigned /account visitors to sign-in", async () => {
    getAuthOrNull.mockReturnValue({
      middleware: ({ loginUrl }) => async (request) => {
        const dest = new URL(loginUrl, request.url);
        dest.searchParams.set("next", request.nextUrl.pathname);
        return Response.redirect(dest, 307);
      },
    });
    const response = await middleware(
      new NextRequest("https://thegamies.gg/account"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/sign-in");
  });
});
