import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getAuthOrNull: vi.fn(() => null as null | {
    $ba: { api: { getSession: ReturnType<typeof vi.fn> } };
  }),
}));
const profiles = vi.hoisted(() => ({
  getProfileByAuthUserId: vi.fn(),
  getProfileByUsername: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => auth.getAuthOrNull(),
}));
vi.mock("@/lib/profile/service", () => profiles);

import {
  authorizeLoadtestRequest,
  loadtestBodyTooLarge,
  requestHostname,
  resolveLoadtestWriteActor,
} from "./loadtest-guard";

function req(
  url: string,
  init: {
    authorization?: string;
    cookie?: string;
    writer?: string;
    forwardedHost?: string;
    length?: string;
  } = {},
) {
  const headers = new Headers();
  if (init.authorization) headers.set("authorization", init.authorization);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.writer) headers.set("x-loadtest-writer", init.writer);
  if (init.forwardedHost) headers.set("x-forwarded-host", init.forwardedHost);
  if (init.length) headers.set("content-length", init.length);
  return new Request(url, { method: "POST", headers });
}

const env = { LOADTEST_SECRET: "load-s3cret" };
const staging =
  "https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest";

describe("authorizeLoadtestRequest", () => {
  it("allows Bearer secret on staging hosts", () => {
    expect(
      authorizeLoadtestRequest(
        req(staging, { authorization: "Bearer load-s3cret" }),
        env,
      ),
    ).toEqual({ ok: true });
  });

  it("returns 404 on production hosts even with the secret", () => {
    for (const url of [
      "https://thegamies.gg/api/qa/loadtest",
      "https://www.thegamies.gg/api/qa/loadtest",
      "https://thegamies-v2.ecdm981.workers.dev/api/qa/loadtest",
    ]) {
      const result = authorizeLoadtestRequest(
        req(url, { authorization: "Bearer load-s3cret" }),
        env,
      );
      expect(result).toEqual({ status: 404, error: "Not found." });
    }
  });

  it("returns 404 when the forwarded host is production", () => {
    const result = authorizeLoadtestRequest(
      req(staging, {
        authorization: "Bearer load-s3cret",
        forwardedHost: "thegamies.gg",
      }),
      env,
    );
    expect(result).toEqual({ status: 404, error: "Not found." });
  });

  it("returns 401 for missing or wrong secrets and never echoes them", () => {
    const wrong = authorizeLoadtestRequest(
      req(staging, { authorization: "Bearer other" }),
      env,
    );
    expect(wrong).toEqual({ status: 401, error: "Unauthorized." });
    expect(JSON.stringify(wrong)).not.toContain("load-s3cret");

    const missingSecret = authorizeLoadtestRequest(
      req(staging, { authorization: "Bearer load-s3cret" }),
      { LOADTEST_SECRET: "" },
    );
    expect(missingSecret).toEqual({ status: 401, error: "Unauthorized." });
  });
});

describe("resolveLoadtestWriteActor", () => {
  beforeEach(() => {
    auth.getAuthOrNull.mockReset();
    auth.getAuthOrNull.mockReturnValue(null);
    profiles.getProfileByAuthUserId.mockReset();
    profiles.getProfileByUsername.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("404s on production hosts before session or secret", async () => {
    const result = await resolveLoadtestWriteActor(
      req("https://thegamies.gg/api/qa/loadtest", {
        authorization: "Bearer load-s3cret",
        writer: "1",
        cookie: "session=x",
      }),
      env,
    );
    expect(result).toEqual({ status: 404, error: "Not found." });
  });

  it("resolves a load-test Auth session without the secret", async () => {
    const getSession = vi.fn().mockResolvedValue({
      user: { id: "auth-1", email: "thegamies-qa-load-001@example.com" },
    });
    auth.getAuthOrNull.mockReturnValue({ $ba: { api: { getSession } } });
    profiles.getProfileByAuthUserId.mockResolvedValue({
      id: "p-session",
      username: "gamies_qa_load_001",
    });

    const result = await resolveLoadtestWriteActor(
      req(staging, { cookie: "better-auth.session_token=abc" }),
      { LOADTEST_SECRET: "" },
    );
    expect(result).toEqual({
      ok: true,
      profileId: "p-session",
      mode: "session",
    });
    expect(profiles.getProfileByUsername).not.toHaveBeenCalled();
  });

  it("rejects a non-loadtest session user", async () => {
    const getSession = vi.fn().mockResolvedValue({
      user: { id: "auth-real", email: "player@gmail.com" },
    });
    auth.getAuthOrNull.mockReturnValue({ $ba: { api: { getSession } } });

    const result = await resolveLoadtestWriteActor(
      req(staging, { cookie: "better-auth.session_token=abc" }),
      env,
    );
    expect(result).toEqual({ status: 401, error: "Unauthorized." });
  });

  it("falls back to Bearer secret + writer header", async () => {
    profiles.getProfileByUsername.mockResolvedValue({ id: "p-secret" });
    const result = await resolveLoadtestWriteActor(
      req(staging, {
        authorization: "Bearer load-s3cret",
        writer: "1",
      }),
      env,
    );
    expect(result).toEqual({
      ok: true,
      profileId: "p-secret",
      mode: "secret",
    });
    expect(profiles.getProfileByUsername).toHaveBeenCalledWith(
      "gamies_qa_load_001",
    );
  });

  it("requires a writer index on the secret escape hatch", async () => {
    const result = await resolveLoadtestWriteActor(
      req(staging, { authorization: "Bearer load-s3cret" }),
      env,
    );
    expect(result).toEqual({ status: 400, error: "Writer required." });
  });
});

describe("loadtest body cap", () => {
  it("rejects oversized content-length", () => {
    expect(loadtestBodyTooLarge("33000")).toBe(true);
    expect(loadtestBodyTooLarge("100")).toBe(false);
  });
});

describe("requestHostname", () => {
  it("prefers x-forwarded-host", () => {
    expect(
      requestHostname(
        req("https://example.workers.dev/api/qa/loadtest", {
          forwardedHost: "thegamies.gg",
        }),
      ),
    ).toBe("thegamies.gg");
  });
});
