import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearNeonJwksCache, verifyNeonAuthWebhook } from "./neon-webhook";

const JWKS_URL = "https://auth.example/.well-known/jwks.json";
const NOW = 1_800_000_000_000;

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };

function signed(body: string, timestamp: number, kid = "k1") {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA", kid })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    `${timestamp}.${Buffer.from(body, "utf8").toString("base64url")}`,
    "utf8",
  ).toString("base64url");
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey);
  return {
    rawBody: body,
    signature: `${header}..${signature.toString("base64url")}`,
    kid,
    timestamp: String(timestamp),
    jwksUrl: JWKS_URL,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  clearNeonJwksCache();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    Response.json({ keys: [jwk] }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyNeonAuthWebhook", () => {
  it("rejects missing signature headers", async () => {
    await expect(
      verifyNeonAuthWebhook({
        rawBody: "{}",
        signature: null,
        kid: null,
        timestamp: null,
        jwksUrl: JWKS_URL,
      }),
    ).rejects.toThrow("missing-headers");
  });

  it("accepts a valid signature", async () => {
    const body = JSON.stringify({ event_type: "send.otp" });
    await expect(
      verifyNeonAuthWebhook({ ...signed(body, NOW), nowMs: NOW }),
    ).resolves.toEqual({ event_type: "send.otp" });
  });

  it("rejects old and far-future timestamps before fetching keys", async () => {
    await expect(
      verifyNeonAuthWebhook({
        ...signed("{}", NOW - 6 * 60 * 1000),
        nowMs: NOW,
      }),
    ).rejects.toThrow("stale");
    await expect(
      verifyNeonAuthWebhook({ ...signed("{}", NOW + 2 * 60 * 1000), nowMs: NOW }),
    ).rejects.toThrow("future");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows small clock skew into the future", async () => {
    await expect(
      verifyNeonAuthWebhook({ ...signed("{}", NOW + 30 * 1000), nowMs: NOW }),
    ).resolves.toEqual({});
  });

  it("rejects a tampered body", async () => {
    const input = signed('{"a":1}', NOW);
    await expect(
      verifyNeonAuthWebhook({ ...input, rawBody: '{"a":2}', nowMs: NOW }),
    ).rejects.toThrow("signature");
  });

  it("caches signing keys between requests", async () => {
    await verifyNeonAuthWebhook({ ...signed("{}", NOW), nowMs: NOW });
    await verifyNeonAuthWebhook({ ...signed("{}", NOW), nowMs: NOW + 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await verifyNeonAuthWebhook({
      ...signed("{}", NOW + 11 * 60 * 1000),
      nowMs: NOW + 11 * 60 * 1000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not refetch on every unknown key id", async () => {
    await verifyNeonAuthWebhook({ ...signed("{}", NOW), nowMs: NOW });
    for (let i = 0; i < 5; i += 1) {
      await expect(
        verifyNeonAuthWebhook({ ...signed("{}", NOW, `forged-${i}`), nowMs: NOW + i }),
      ).rejects.toThrow("key");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("picks up a rotated key after the miss window", async () => {
    await verifyNeonAuthWebhook({ ...signed("{}", NOW), nowMs: NOW });
    fetchMock.mockImplementation(async () =>
      Response.json({ keys: [jwk, { ...jwk, kid: "k2" }] }),
    );
    const later = NOW + 2 * 60 * 1000;
    await expect(
      verifyNeonAuthWebhook({ ...signed("{}", later, "k2"), nowMs: later }),
    ).resolves.toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
