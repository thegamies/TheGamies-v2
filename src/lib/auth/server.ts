import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

function readAuthEnv(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!baseUrl || !secret || secret.length < 32) {
    return null;
  }
  return { baseUrl, secret };
}

export function isAuthConfigured(): boolean {
  return readAuthEnv() !== null;
}

let cached: NeonAuth | null | undefined;

function createAuthOrNull(): NeonAuth | null {
  const env = readAuthEnv();
  if (!env) return null;
  return createNeonAuth({
    baseUrl: env.baseUrl,
    cookies: { secret: env.secret },
  });
}

/** Auth instance when env is set; otherwise null (pages can still render). */
export function getAuthOrNull(): NeonAuth | null {
  if (cached === undefined) {
    cached = createAuthOrNull();
  }
  return cached;
}

/** Auth instance for sign-in/up/account — throws a clear error if env is missing. */
export function getAuth(): NeonAuth {
  const instance = getAuthOrNull();
  if (!instance) {
    throw new Error(
      "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ chars) in Doppler, then restart the server.",
    );
  }
  return instance;
}

/** @deprecated Prefer getAuth() / getAuthOrNull() — kept for call sites that need a stable export. */
export const auth = new Proxy({} as NeonAuth, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
