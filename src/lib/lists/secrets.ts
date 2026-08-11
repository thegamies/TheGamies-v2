import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PUBLIC_ID_BYTES = 8;
const SECRET_BYTES = 24;

/** Short URL-safe public id (nanoid-like). */
export function generatePublicId(): string {
  return randomBytes(PUBLIC_ID_BYTES).toString("base64url");
}

/** High-entropy edit secret for the cookie (never store plaintext). */
export function generateEditSecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

export function hashEditSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function editSecretMatches(
  secret: string,
  hash: string | null | undefined,
): boolean {
  if (!hash) return false;
  const computed = hashEditSecret(secret);
  if (computed.length !== hash.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(hash, "utf8"),
    );
  } catch {
    return false;
  }
}
