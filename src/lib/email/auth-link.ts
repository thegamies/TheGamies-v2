import { safeNextPath } from "@/lib/auth/safe-next";
import { PASSWORD_RESET_PATH } from "@/lib/auth/return-to";
import {
  resetPasswordFormPath,
  tokenFromResetPasswordHref,
} from "@/lib/auth/reset-password-token";

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

/**
 * Confirm-email clicks land on the app with the token still unused, so the
 * client can verify through `/api/auth` and store the session cookie.
 */
export function confirmationPageHref(
  href: string,
  input: { appOrigin: string; neonAuthBaseUrl: string },
): string {
  const rewritten = rewriteNeonAuthEmailHref(href, input);
  let link: URL;
  try {
    link = new URL(rewritten);
  } catch {
    return rewritten;
  }
  const token = link.searchParams.get("token");
  if (!token) return rewritten;
  const next = nextFromCallback(link.searchParams.get("callbackURL"), input.appOrigin);
  const appOrigin = input.appOrigin.replace(/\/$/, "");
  return `${appOrigin}/auth/confirmed?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;
}

/**
 * Reset-password clicks should land on the app with the token still unused.
 */
export function resetPasswordPageHref(
  href: string,
  input: { appOrigin: string; neonAuthBaseUrl: string; token?: string | null },
): string {
  const token = tokenFromResetPasswordHref(href, input.token);
  const appOrigin = input.appOrigin.replace(/\/$/, "");
  if (!token) return `${appOrigin}${PASSWORD_RESET_PATH}`;
  return `${appOrigin}${resetPasswordFormPath(token)}`;
}

function nextFromCallback(
  callback: string | null,
  appOrigin: string,
): string {
  if (!callback) return "/account";
  try {
    const url = callback.startsWith("/")
      ? new URL(callback, appOrigin)
      : new URL(callback);
    const fromQuery = safeNextPath(url.searchParams.get("next"));
    if (fromQuery) return fromQuery;
    if (url.pathname.startsWith("/auth/")) return "/account";
    return safeNextPath(`${url.pathname}${url.search}`) ?? "/account";
  } catch {
    return "/account";
  }
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

