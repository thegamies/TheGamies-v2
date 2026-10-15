import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_DATA_COOKIE_NAME, SESSION_TOKEN_COOKIE_NAME } from "@/lib/auth/session-cache-cookie";

const getAuthOrNull = vi.fn(() => null as null | { handler: () => { GET: (request: Request, context: unknown) => Promise<Response> } });

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => getAuthOrNull(),
}));

import { GET } from "./route";

function jwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.sig`;
}

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
      { params: Promise.resolve({ path: ["reset-password", "KFsLY2b9lHmTgsviFkbrS7gR"] }) },
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

  it("keeps a fresh session cache so the handler does not call Neon", async () => {
    let seen: string | null = null;
    getAuthOrNull.mockReturnValue({
      handler: () => ({
        GET: async (request: Request) => {
          seen = request.headers.get("cookie");
          return new Response(null, { status: 200 });
        },
      }),
    });
    const exp = Math.floor(Date.now() / 1000) + 200;
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=${jwt(exp)}`;
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

  it("leaves a near-expiry session cache in place", async () => {
    let seen: string | null = null;
    getAuthOrNull.mockReturnValue({
      handler: () => ({
        GET: async (request: Request) => {
          seen = request.headers.get("cookie");
          return new Response(null, { status: 200 });
        },
      }),
    });
    const exp = Math.floor(Date.now() / 1000) + 30;
    const cookie = `${SESSION_TOKEN_COOKIE_NAME}=tok; ${SESSION_DATA_COOKIE_NAME}=${jwt(exp)}`;
    const response = await GET(
      new Request("https://thegamies.gg/api/auth/get-session", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ path: ["get-session"] }) },
    );
    expect(response.status).toBe(200);
    expect(seen).toBe(cookie);
  });
});
