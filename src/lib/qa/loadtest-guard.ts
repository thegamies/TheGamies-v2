import { timingSafeEqualString } from "@thegamies/igdb";
import { isProductionAppHost } from "@/lib/qa/staging-fixtures";

const MAX_BODY_BYTES = 32 * 1024;

export function requestHostname(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.toLowerCase();
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function loadtestSecretFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const secret = env.LOADTEST_SECRET?.trim() ?? "";
  return secret.length > 0 ? secret : null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match?.[1] ?? null;
}

/**
 * Production hosts always 404 (even if a secret leaked). Missing or wrong
 * secret is 401. Never echoes the secret.
 */
export function authorizeLoadtestRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { status: 401 | 404; error: string } {
  const host = requestHostname(request);
  if (host && isProductionAppHost(host)) {
    return { status: 404, error: "Not found." };
  }
  const expected = loadtestSecretFromEnv(env);
  const received = bearerToken(request);
  if (!expected || !received || !timingSafeEqualString(received, expected)) {
    return { status: 401, error: "Unauthorized." };
  }
  return { ok: true };
}

export function loadtestBodyTooLarge(contentLength: string | null): boolean {
  const n = Number(contentLength);
  if (!Number.isFinite(n) || n < 0) return false;
  return n > MAX_BODY_BYTES;
}

export { MAX_BODY_BYTES as LOADTEST_MAX_BODY_BYTES };
