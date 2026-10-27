import { createNeonAuth } from "@neondatabase/auth/next/server";
import { readAuthEnv } from "@/lib/auth/auth-env";
import { guardSessionReads } from "@/lib/auth/guard-session-reads";
import { SESSION_DATA_TTL_SEC } from "@/lib/auth/session-cache-cookie";
import {
  createSelfHostedAuth,
  type SelfHostedAuth,
} from "@/lib/auth/self-hosted-server";
import { useSelfHostedAuth } from "@/lib/auth/self-hosted-env";

type NeonAuth = ReturnType<typeof createNeonAuth>;
export type AppAuth = NeonAuth | SelfHostedAuth;

export function isAuthConfigured(): boolean {
  return useSelfHostedAuth() || readAuthEnv() !== null;
}

let cached: AppAuth | null | undefined;

function createAuthOrNull(): AppAuth | null {
  if (useSelfHostedAuth()) {
    return createSelfHostedAuth();
  }
  const env = readAuthEnv();
  if (!env) return null;
  return guardSessionReads(
    createNeonAuth({
      baseUrl: env.baseUrl,
      cookies: {
        secret: env.secret,
        // Lax so the OAuth challenge cookie is sent on the Google return hop.
        sameSite: "lax",
        sessionDataTtl: SESSION_DATA_TTL_SEC,
      },
    }),
  );
}

/** Auth instance when env is set; otherwise null (pages can still render). */
export function getAuthOrNull(): AppAuth | null {
  // Only cache a successful instance. On Cloudflare, process.env may populate
  // after the first module evaluation — permanently caching null breaks auth.
  if (cached) return cached;
  const created = createAuthOrNull();
  if (created) {
    cached = created;
  }
  return created;
}

/** Auth instance for sign-in/up/account — throws a clear error if env is missing. */
export function getAuth(): AppAuth {
  const instance = getAuthOrNull();
  if (!instance) {
    throw new Error(
      useSelfHostedAuth()
        ? "Self-hosted Better Auth is not configured. Set BETTER_AUTH_SECRET (32+ chars) and DATABASE_URL."
        : "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ chars) in Doppler, then restart the server.",
    );
  }
  return instance;
}

/** @deprecated Prefer getAuth() / getAuthOrNull() — kept for call sites that need a stable export. */
export const auth = new Proxy({} as AppAuth, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
