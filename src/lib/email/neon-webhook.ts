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

  const ageMs = (input.nowMs ?? Date.now()) - Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) {
    throw new Error("stale");
  }

  const jwksRes = await fetch(jwksUrl);
  if (!jwksRes.ok) {
    throw new Error("jwks");
  }
  const jwks = (await jwksRes.json()) as { keys?: Jwk[] };
  const jwk = jwks.keys?.find((key) => key.kid === kid);
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
