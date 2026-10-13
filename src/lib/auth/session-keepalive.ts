/**
 * Neon Auth session cache TTL is 300s. Ping before that so the get-session
 * route can re-mint the signed cache cookie while it is still valid.
 */
export const SESSION_KEEPALIVE_PATH = "/api/auth/get-session";
export const SESSION_KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

export async function refreshSessionCookie(): Promise<boolean> {
  try {
    const response = await fetch(SESSION_KEEPALIVE_PATH, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}
