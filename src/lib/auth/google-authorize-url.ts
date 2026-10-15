import {
  isGoogleAuthorizeHost,
  withGoogleAccountPicker,
} from "./google-account-picker";

/**
 * Neon returns an init URL. The browser must visit it so the auth host can
 * set its state cookie, then continue to Google with the account chooser.
 */
export function isSocialInitUrl(href: string, authBaseUrl: string): boolean {
  let init: URL;
  let base: URL;
  try {
    init = new URL(href);
    base = new URL(authBaseUrl);
  } catch {
    return false;
  }
  if (init.origin !== base.origin || init.protocol !== "https:") return false;
  const basePath = base.pathname.replace(/\/$/, "");
  return (
    init.pathname === `${basePath}/sign-in/social/init` &&
    init.searchParams.has("token")
  );
}

/** Google authorize URL with the account chooser, or null when it is not Google's. */
export function googleAuthorizeUrlFromLocation(location: string): string | null {
  const picked = withGoogleAccountPicker(location);
  let url: URL;
  try {
    url = new URL(picked);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !isGoogleAuthorizeHost(url.hostname)) {
    return null;
  }
  if (!url.pathname.startsWith("/o/oauth2/")) return null;
  const prompt = url.searchParams.get("prompt") ?? "";
  if (!prompt.split(/[\s+]+/).includes("select_account")) return null;
  return url.toString();
}

export async function resolveSocialInitToGoogle(
  initUrl: string,
  authBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!isSocialInitUrl(initUrl, authBaseUrl)) return null;
  const response = await fetchImpl(initUrl, { redirect: "manual" });
  const location = response.headers.get("location");
  if (!location) return null;
  return googleAuthorizeUrlFromLocation(location);
}
