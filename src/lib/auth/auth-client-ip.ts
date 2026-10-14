import { AsyncLocalStorage } from "node:async_hooks";
import { noteNeonAuthFetch } from "@/lib/auth/neon-auth-meter";

/**
 * Neon Auth rate-limits by the first `x-forwarded-for` address. The Auth SDK
 * does not copy the visitor IP, so cache misses were counted on the Worker
 * egress address and one burst throttled the whole site.
 *
 * `cf-connecting-ip` is set by Cloudflare and is not a client-supplied
 * forwarding header.
 *
 * Worker bundles each get their own copy of this module, but they share
 * `globalThis`. A second copy must not wrap `fetch` again, and this wrapper
 * must call the fetch it captured at install time. Calling the current
 * `globalThis.fetch` makes the two wrappers recurse until sign-in dies with
 * "Maximum call stack size exceeded".
 */
export const AUTH_CLIENT_IP_FETCH = Symbol.for("thegamies.authClientIpFetch");

type AuthClientIpSlot = {
  ips: AsyncLocalStorage<string>;
  /** Fetch captured once, before this module replaced `globalThis.fetch`. */
  underlying: typeof fetch | null;
};

function authClientIpSlot(): AuthClientIpSlot {
  const globalRecord = globalThis as typeof globalThis & {
    [AUTH_CLIENT_IP_FETCH]?: AuthClientIpSlot;
  };
  const existing = globalRecord[AUTH_CLIENT_IP_FETCH];
  if (existing) return existing;
  const created: AuthClientIpSlot = {
    ips: new AsyncLocalStorage<string>(),
    underlying: null,
  };
  globalRecord[AUTH_CLIENT_IP_FETCH] = created;
  return created;
}

export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  const raw = headers.get("cf-connecting-ip")?.trim() ?? "";
  if (!raw || raw.length > 64 || /[\s,]/.test(raw)) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) {
    if (raw.split(".").some((part) => Number(part) > 255)) return null;
    return raw;
  }
  if (raw.includes(":") && /^[0-9A-Fa-f:.]+$/.test(raw)) return raw;
  return null;
}

/** Pathname of an Auth URL, with no query string. `null` for any other host. */
export function neonAuthFetchTarget(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  authBaseUrl: string,
): { method: string; path: string } | null {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  if (!isNeonAuthUrl(url, authBaseUrl)) return null;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  const method = (
    init?.method ??
    (typeof Request !== "undefined" && input instanceof Request
      ? input.method
      : "GET")
  ).toUpperCase();
  return { method, path };
}

export function isNeonAuthUrl(url: string, authBaseUrl: string): boolean {
  let target: URL;
  let base: URL;
  try {
    target = new URL(url);
    base = new URL(authBaseUrl);
  } catch {
    return false;
  }
  if (target.origin !== base.origin) return false;
  const prefix = base.pathname.replace(/\/$/, "");
  return (
    prefix === "" ||
    target.pathname === prefix ||
    target.pathname.startsWith(`${prefix}/`)
  );
}

export function withClientIpHeader(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ip: string,
  authBaseUrl: string,
): { input: RequestInfo | URL; init?: RequestInit } | null {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  if (!isNeonAuthUrl(url, authBaseUrl)) return null;
  const headers = new Headers(
    init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined),
  );
  headers.set("x-forwarded-for", ip);
  if (typeof input === "string" || input instanceof URL) {
    return { input, init: { ...init, headers } };
  }
  return { input: new Request(input, { ...init, headers }) };
}

export function withAuthClientIp<T>(ip: string | null, run: () => T): T {
  installAuthClientIpFetch();
  if (!ip) return run();
  return authClientIpSlot().ips.run(ip, run);
}

export function shareInflight<T>(
  inflight: Map<string, Promise<T>>,
  key: string | null,
  run: () => Promise<T>,
): Promise<T> {
  if (!key) return run();
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = run().finally(() => {
    if (inflight.get(key) === pending) inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

function installAuthClientIpFetch(): void {
  const slot = authClientIpSlot();
  if (slot.underlying) return;
  const underlying = globalThis.fetch.bind(globalThis);
  slot.underlying = underlying;
  const wrapped: typeof fetch = async (input, init) => {
    const next = slot.underlying ?? underlying;
    const ip = slot.ips.getStore();
    const base = process.env.NEON_AUTH_BASE_URL?.trim();
    const target = base ? neonAuthFetchTarget(input, init, base) : null;
    const forwarded =
      ip && base ? withClientIpHeader(input, init, ip, base) : null;
    const callInput = forwarded?.input ?? input;
    const callInit = forwarded?.init ?? init;
    if (!target) return next(callInput, callInit);
    try {
      const response = await next(callInput, callInit);
      noteNeonAuthFetch(target.method, target.path, response.status);
      return response;
    } catch (error) {
      noteNeonAuthFetch(target.method, target.path, 0);
      throw error;
    }
  };
  globalThis.fetch = wrapped;
}
