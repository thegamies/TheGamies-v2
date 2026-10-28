import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthOrNull = vi.fn(
  () =>
    null as null | {
      handler: () => {
        GET: (request: Request, context: unknown) => Promise<Response>;
      };
    },
);

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => getAuthOrNull(),
}));

import { GET } from "./route";

describe("GET /api/auth/reset-password/:token", () => {
  beforeEach(() => {
    getAuthOrNull.mockReset();
    getAuthOrNull.mockReturnValue(null);
  });

  it("keeps the path token unused on the reset form", async () => {
    const response = await GET(
      new Request(
        "https://thegamies-v2-develop.ecdm981.workers.dev/api/auth/reset-password/KFsLY2b9lHmTgsviFkbrS7gR?callbackURL=https%3A%2F%2Fthegamies-v2-develop.ecdm981.workers.dev%2Fauth%2Freset-password",
      ),
      {
        params: Promise.resolve({
          path: ["reset-password", "KFsLY2b9lHmTgsviFkbrS7gR"],
        }),
      },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://thegamies-v2-develop.ecdm981.workers.dev/auth/reset-password?token=KFsLY2b9lHmTgsviFkbrS7gR",
    );
    expect(getAuthOrNull).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/get-session", () => {
  beforeEach(() => {
    getAuthOrNull.mockReset();
  });

  it("forwards the request cookie header to Better Auth", async () => {
    let seen: string | null = null;
    getAuthOrNull.mockReturnValue({
      handler: () => ({
        GET: async (request: Request) => {
          seen = request.headers.get("cookie");
          return new Response(null, { status: 200 });
        },
      }),
    });
    const cookie = "__Secure-better-auth.session_token=tok";
    const response = await GET(
      new Request("https://thegamies.gg/api/auth/get-session", {
        headers: {
          cookie,
          "cf-connecting-ip": "203.0.113.8",
        },
      }),
      { params: Promise.resolve({ path: ["get-session"] }) },
    );
    expect(response.status).toBe(200);
    expect(seen).toBe(cookie);
  });
});
