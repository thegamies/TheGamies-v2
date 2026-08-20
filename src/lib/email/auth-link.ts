/**
 * Neon Auth email links hit the hosted Auth origin. Clicking those cannot set
 * the app session cookie (cross-site). Proxy the same path through `/api/auth`.
 */
export function rewriteNeonAuthEmailHref(
  href: string,
  input: { appOrigin: string; neonAuthBaseUrl: string },
): string {
  let link: URL;
  let neon: URL;
  try {
    link = new URL(href);
    neon = new URL(
      input.neonAuthBaseUrl.endsWith("/")
        ? input.neonAuthBaseUrl
        : `${input.neonAuthBaseUrl}/`,
    );
  } catch {
    return href;
  }
  if (link.origin !== neon.origin) return href;
  const neonPath = neon.pathname.replace(/\/$/, "");
  if (link.pathname !== neonPath && !link.pathname.startsWith(`${neonPath}/`)) {
    return href;
  }
  const rest = link.pathname.slice(neonPath.length).replace(/^\//, "");
  if (!rest) return href;

  const appOrigin = input.appOrigin.replace(/\/$/, "");
  const rewritten = new URL(`${appOrigin}/api/auth/${rest}${link.search}`);
  const callback = rewritten.searchParams.get("callbackURL");
  if (callback) {
    const next = rewriteCallbackToAppOrigin(callback, appOrigin);
    if (next) rewritten.searchParams.set("callbackURL", next);
  }
  return rewritten.toString();
}

function rewriteCallbackToAppOrigin(
  callback: string,
  appOrigin: string,
): string | null {
  try {
    if (callback.startsWith("/") && !callback.startsWith("//")) {
      return `${appOrigin}${callback}`;
    }
    const url = new URL(callback);
    return `${appOrigin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
