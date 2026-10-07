export type NeonAuthEmailPayload = {
  event_type?: string;
  user?: { email?: string; name?: string };
  event_data?: {
    link_type?: string;
    link_url?: string;
    token?: string;
    otp_code?: string;
    otp_type?: string;
    expires_at?: string;
    current_email?: string;
    new_email?: string;
  };
};

type Jwk = {
  kid?: string;
  kty?: string;
  crv?: string;
  x?: string;
};

const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 1000;
const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_MISS_REFETCH_MS = 60 * 1000;

const jwksCache = new Map<string, { keys: Jwk[]; fetchedAtMs: number }>();

export function clearNeonJwksCache(): void {
  jwksCache.clear();
}

async function fetchJwks(jwksUrl: string, nowMs: number): Promise<Jwk[]> {
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    throw new Error("jwks");
  }
  const keys = ((await res.json()) as { keys?: Jwk[] }).keys ?? [];
  jwksCache.set(jwksUrl, { keys, fetchedAtMs: nowMs });
  return keys;
}

/**
 * Cached keys. An unknown `kid` refetches (key rotation) at most once per
 * minute, so forged requests cannot force a fetch each time.
 */
async function findJwk(
  jwksUrl: string,
  kid: string,
  nowMs: number,
): Promise<Jwk | undefined> {
  const cached = jwksCache.get(jwksUrl);
  if (cached) {
    const ageMs = nowMs - cached.fetchedAtMs;
    if (ageMs < JWKS_TTL_MS) {
      const hit = cached.keys.find((key) => key.kid === kid);
      if (hit || ageMs < JWKS_MISS_REFETCH_MS) return hit;
    }
  }
  const keys = await fetchJwks(jwksUrl, nowMs);
  return keys.find((key) => key.kid === kid);
}

function b64urlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

export async function verifyNeonAuthWebhook(input: {
  rawBody: string;
  signature: string | null;
  kid: string | null;
  timestamp: string | null;
  jwksUrl: string;
  nowMs?: number;
}): Promise<NeonAuthEmailPayload> {
  const { signature, kid, timestamp, rawBody, jwksUrl } = input;
  if (!signature || !kid || !timestamp) {
    throw new Error("missing-headers");
  }

  const nowMs = input.nowMs ?? Date.now();
  const ageMs = nowMs - Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) {
    throw new Error("stale");
  }
  if (ageMs < -MAX_FUTURE_SKEW_MS) {
    throw new Error("future");
  }

  const jwk = await findJwk(jwksUrl, kid, nowMs);
  if (!jwk) {
    throw new Error("key");
  }

  const crypto = await import("node:crypto");
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (!headerB64 || emptyPayload !== "" || !signatureB64) {
    throw new Error("jws");
  }

  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, "utf8").toString(
    "base64url",
  );
  const signingInput = `${headerB64}.${signaturePayloadB64}`;
  const isValid = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    b64urlToBuffer(signatureB64),
  );
  if (!isValid) {
    throw new Error("signature");
  }

  return JSON.parse(rawBody) as NeonAuthEmailPayload;
}

export function neonAuthJwksUrl(baseUrl: string): string {
  const trimmed = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(".well-known/jwks.json", trimmed).toString();
}
