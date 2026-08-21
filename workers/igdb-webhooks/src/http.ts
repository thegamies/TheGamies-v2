export function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const len = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const x = i < left.length ? left[i]! : 0;
    const y = i < right.length ? right[i]! : 0;
    mismatch |= x ^ y;
  }
  return mismatch === 0;
}

export function requireAdmin(request: Request, secret: string): Response | null {
  if (!secret) {
    return json({ error: "Admin is not configured." }, 503);
  }
  const header = request.headers.get("x-admin-sync-secret") ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (
    timingSafeEqual(header, secret) ||
    (bearer && timingSafeEqual(bearer, secret))
  ) {
    return null;
  }
  return json({ error: "Unauthorized." }, 401);
}

/** Assign Worker secrets onto process.env for shared packages. */
export function bindProcessEnv(env: Env): void {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.IGDB_CLIENT_ID = env.IGDB_CLIENT_ID;
  process.env.IGDB_CLIENT_SECRET = env.IGDB_CLIENT_SECRET;
  process.env.IGDB_WEBHOOK_SECRET = env.IGDB_WEBHOOK_SECRET;
  process.env.ADMIN_SYNC_SECRET = env.ADMIN_SYNC_SECRET;
}
