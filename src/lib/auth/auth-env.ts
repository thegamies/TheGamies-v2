import { SESSION_DATA_TTL_SEC } from "@/lib/auth/session-cache-cookie";

export function readAuthEnv(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!baseUrl || !secret || secret.length < 32) {
    return null;
  }
  return { baseUrl, secret };
}

/** Auth URL, cookie secret, and cache lifetime. Null when Auth is not configured. */
export function getAuthRuntimeConfig(): {
  baseUrl: string;
  secret: string;
  sessionDataTtl: number;
} | null {
  const env = readAuthEnv();
  if (!env) return null;
  return { ...env, sessionDataTtl: SESSION_DATA_TTL_SEC };
}
