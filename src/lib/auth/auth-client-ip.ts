import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Neon Auth rate-limits by the first `x-forwarded-for` address. The Auth SDK
 * does not copy the visitor IP, so cache misses were counted on the Worker
 * egress address and one burst throttled the whole site.
 *
 * `cf-connecting-ip` is set by Cloudflare and is not a client-supplied
 * forwarding header.
 */
const clientIp = new AsyncLocalStorage<string>();

let installed = false;
let nativeFetch: typeof fetch | null = null;

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
  if (!ip) return run();
  installAuthClientIpFetch();
  return clientIp.run(ip, run);
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
  if (installed) return;
  installed = true;
  nativeFetch = globalThis.fetch.bind(globalThis);
  const wrapped: typeof fetch = (input, init) => {
    const ip = clientIp.getStore();
    const base = process.env.NEON_AUTH_BASE_URL?.trim();
    const target = globalThis.fetch === wrapped ? nativeFetch! : globalThis.fetch;
    if (!ip || !base) return target(input, init);
    const forwarded = withClientIpHeader(input, init, ip, base);
    if (!forwarded) return target(input, init);
    return target(forwarded.input, forwarded.init);
  };
  globalThis.fetch = wrapped;
}
