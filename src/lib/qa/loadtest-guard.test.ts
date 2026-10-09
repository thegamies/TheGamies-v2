import { describe, expect, it } from "vitest";
import {
  authorizeLoadtestRequest,
  loadtestBodyTooLarge,
  requestHostname,
} from "./loadtest-guard";

function req(
  url: string,
  init: { authorization?: string; forwardedHost?: string; length?: string } = {},
) {
  const headers = new Headers();
  if (init.authorization) headers.set("authorization", init.authorization);
  if (init.forwardedHost) headers.set("x-forwarded-host", init.forwardedHost);
  if (init.length) headers.set("content-length", init.length);
  return new Request(url, { method: "POST", headers });
}

const env = { LOADTEST_SECRET: "load-s3cret" };

describe("authorizeLoadtestRequest", () => {
  it("allows Bearer secret on staging hosts", () => {
    expect(
      authorizeLoadtestRequest(
        req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
          authorization: "Bearer load-s3cret",
        }),
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
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        authorization: "Bearer load-s3cret",
        forwardedHost: "thegamies.gg",
      }),
      env,
    );
    expect(result).toEqual({ status: 404, error: "Not found." });
  });

  it("returns 401 for missing or wrong secrets and never echoes them", () => {
    const wrong = authorizeLoadtestRequest(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        authorization: "Bearer other",
      }),
      env,
    );
    expect(wrong).toEqual({ status: 401, error: "Unauthorized." });
    expect(JSON.stringify(wrong)).not.toContain("load-s3cret");

    const missingSecret = authorizeLoadtestRequest(
      req("https://thegamies-v2-develop.ecdm981.workers.dev/api/qa/loadtest", {
        authorization: "Bearer load-s3cret",
      }),
      { LOADTEST_SECRET: "" },
    );
    expect(missingSecret).toEqual({ status: 401, error: "Unauthorized." });
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
