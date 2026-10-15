/**
 * Cloudflare Workers Cache API (`caches.default`). Colo-local; TTL is the purge.
 * Missing in `next dev` / Vitest — callers must tolerate a miss.
 */

export function workersDefaultCache(): Cache | null {
  try {
    const store = (globalThis as { caches?: { default?: Cache } }).caches;
    return store?.default ?? null;
  } catch {
    return null;
  }
}

export async function matchWorkersCacheJson<T>(request: Request): Promise<T | null> {
  const cache = workersDefaultCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(request);
    if (!hit) return null;
    return (await hit.json()) as T;
  } catch {
    return null;
  }
}

export async function putWorkersCacheJson(
  request: Request,
  value: unknown,
  maxAgeSeconds: number,
): Promise<void> {
  const cache = workersDefaultCache();
  if (!cache) return;
  const age = Math.max(1, Math.floor(maxAgeSeconds));
  try {
    const response = new Response(JSON.stringify(value), {
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${age}`,
      },
    });
    await cache.put(request, response);
  } catch {
    // Node and some test runtimes reject Cache.put; the live read still works.
  }
}
