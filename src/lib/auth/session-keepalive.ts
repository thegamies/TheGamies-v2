/**
 * Ping the Auth route while a tab is open. A valid session-cache cookie is
 * answered in the Worker. After it expires, the next ping lets the route
 * mint a replacement so Set-Cookie reaches the browser.
 */
export const SESSION_KEEPALIVE_PATH = "/api/auth/get-session";
export const SESSION_KEEPALIVE_INTERVAL_MS = 60 * 1000;

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
