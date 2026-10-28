import {
  createSelfHostedAuth,
  type SelfHostedAuth,
} from "@/lib/auth/self-hosted-server";
import { isSelfHostedAuthEnabled } from "@/lib/auth/self-hosted-env";

export type AppAuth = SelfHostedAuth;

export function isAuthConfigured(): boolean {
  return isSelfHostedAuthEnabled();
}

let cached: AppAuth | null | undefined;

function createAuthOrNull(): AppAuth | null {
  if (!isSelfHostedAuthEnabled()) return null;
  return createSelfHostedAuth();
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
      "Better Auth is not configured. Set BETTER_AUTH_SECRET (32+ chars) and DATABASE_URL.",
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
