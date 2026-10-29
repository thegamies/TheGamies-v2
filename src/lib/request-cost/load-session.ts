import {
  SESSION_KEEPALIVE_INTERVAL_MS,
  SESSION_KEEPALIVE_PATH,
} from "@/lib/auth/session-keepalive";

export { SESSION_KEEPALIVE_INTERVAL_MS, SESSION_KEEPALIVE_PATH };

export type LoadCookieSlot = {
  cookie: string;
  refreshedAt: number;
  inflight: Promise<void> | null;
};

export function applySetCookieHeaders(
  current: string,
  setCookieHeaders: string[],
): string {
  const map = new Map<string, string>();
  for (const part of current.split(";")) {
    const pair = part.trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    map.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  for (const header of setCookieHeaders) {
    const first = header.split(";")[0]?.trim();
    if (!first) continue;
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq);
    const value = first.slice(eq + 1);
    const attrs = header.toLowerCase();
    if (!value || attrs.includes("max-age=0")) {
      map.delete(name);
      continue;
    }
    map.set(name, value);
  }
  return [...map.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export function setCookieHeadersFromResponse(res: Response): string[] {
  const getSetCookie = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(res.headers).filter(Boolean);
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

export async function refreshLoadSessionCookie(
  appUrl: string,
  cookie: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(`${appUrl}${SESSION_KEEPALIVE_PATH}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie,
      },
    });
    if (!res.ok) return null;
    const setCookies = setCookieHeadersFromResponse(res);
    if (setCookies.length === 0) return cookie;
    return applySetCookieHeaders(cookie, setCookies);
  } catch {
    return null;
  }
}

export type MaintainLoadSessionResult =
  | { action: "skip" }
  | { action: "refreshed"; ms: number }
  | { action: "refresh-failed"; ms: number };

/**
 * Touch the session via `GET /api/auth/get-session` when the keepalive window
 * has elapsed (or `force`). Callers re-sign-in on `refresh-failed`.
 */
export async function maintainLoadSessionCookie(
  slot: LoadCookieSlot,
  appUrl: string,
  now: number,
  force = false,
  fetchImpl: typeof fetch = fetch,
): Promise<MaintainLoadSessionResult> {
  if (
    !force &&
    slot.cookie &&
    slot.refreshedAt > 0 &&
    now - slot.refreshedAt < SESSION_KEEPALIVE_INTERVAL_MS
  ) {
    return { action: "skip" };
  }
  if (!slot.cookie) {
    return { action: "refresh-failed", ms: 0 };
  }
  if (slot.inflight) {
    await slot.inflight;
    if (
      slot.cookie &&
      slot.refreshedAt > 0 &&
      Date.now() - slot.refreshedAt < SESSION_KEEPALIVE_INTERVAL_MS
    ) {
      return { action: "skip" };
    }
  }

  let result: MaintainLoadSessionResult = { action: "refresh-failed", ms: 0 };
  slot.inflight = (async () => {
    const t0 = Date.now();
    const next = await refreshLoadSessionCookie(appUrl, slot.cookie, fetchImpl);
    const ms = Date.now() - t0;
    if (next) {
      slot.cookie = next;
      slot.refreshedAt = Date.now();
      result = { action: "refreshed", ms };
      return;
    }
    result = { action: "refresh-failed", ms };
  })();
  try {
    await slot.inflight;
  } finally {
    slot.inflight = null;
  }
  return result;
}

export async function ensureLoadSessionCookie(
  slot: LoadCookieSlot,
  appUrl: string,
  now: number,
  force: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await maintainLoadSessionCookie(slot, appUrl, now, force, fetchImpl);
}

export function emptyLoadCookieSlot(cookie = ""): LoadCookieSlot {
  return { cookie, refreshedAt: cookie ? Date.now() : 0, inflight: null };
}
