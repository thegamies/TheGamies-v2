import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Visitor IP for Auth handlers (`cf-connecting-ip`).
 *
 * Worker bundles each get their own copy of this module, but they share
 * `globalThis`. A second copy must not wrap shared state again.
 */
export const AUTH_CLIENT_IP_FETCH = Symbol.for("thegamies.authClientIpFetch");

type AuthClientIpSlot = {
  ips: AsyncLocalStorage<string>;
};

function authClientIpSlot(): AuthClientIpSlot {
  const globalRecord = globalThis as typeof globalThis & {
    [AUTH_CLIENT_IP_FETCH]?: AuthClientIpSlot;
  };
  const existing = globalRecord[AUTH_CLIENT_IP_FETCH];
  if (existing) return existing;
  const created: AuthClientIpSlot = {
    ips: new AsyncLocalStorage<string>(),
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

export function withAuthClientIp<T>(ip: string | null, run: () => T): T {
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
