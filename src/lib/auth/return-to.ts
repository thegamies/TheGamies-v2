import {
  parseListAuthIntent,
  withListAuthIntent,
  type ListAuthIntent,
} from "@/lib/lists/auth-intent";
import { safeNextPath } from "@/lib/auth/safe-next";

export type { ListAuthIntent };

/** Build `/auth/sign-in` with optional return path and list intent. */
export function buildSignInHref(opts: {
  next?: string | null;
  intent?: ListAuthIntent | null;
} = {}): string {
  return buildAuthHref("/auth/sign-in", opts);
}

/** Build `/auth/sign-up` with optional return path and list intent. */
export function buildSignUpHref(opts: {
  next?: string | null;
  intent?: ListAuthIntent | null;
} = {}): string {
  return buildAuthHref("/auth/sign-up", opts);
}

/** Build `/auth/verify-email` with optional email, return path, and list intent. */
export function buildVerifyEmailHref(opts: {
  email?: string | null;
  next?: string | null;
  intent?: ListAuthIntent | null;
} = {}): string {
  const href = buildAuthHref("/auth/verify-email", opts);
  const params = new URLSearchParams(href.split("?")[1] ?? "");
  const email = opts.email?.trim();
  if (email) params.set("email", email);
  const qs = params.toString();
  return qs ? `/auth/verify-email?${qs}` : "/auth/verify-email";
}

/** Absolute in-app URL for Auth callbacks (verification / post-sign-up). */
export function buildAbsoluteAppUrl(origin: string, path: string): string | null {
  const base = origin.trim().replace(/\/$/, "");
  if (!base.startsWith("https://") && !base.startsWith("http://localhost")) {
    return null;
  }
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/account";
  return `${base}${safePath}`;
}

/** In-app path Neon should trust for password reset (relative = valid redirect). */
export const PASSWORD_RESET_PATH = "/auth/reset-password";

/** After Google OAuth: finish username, or continue if the profile already exists. */
export const GOOGLE_COMPLETE_PROFILE_PATH = "/auth/complete-profile";

/** In-app path Neon should trust after confirm-email (relative = valid redirect). */
export function emailConfirmedCallbackPath(next: string): string {
  const dest = safeNextPath(next) ?? "/account";
  return `/auth/confirmed?next=${encodeURIComponent(dest)}`;
}

/** Where Neon should send the browser after the confirm-email click. */
export function buildEmailConfirmedCallbackUrl(
  origin: string,
  next: string,
): string | null {
  return buildAbsoluteAppUrl(origin, emailConfirmedCallbackPath(next));
}

function buildAuthHref(
  base: "/auth/sign-in" | "/auth/sign-up" | "/auth/verify-email",
  opts: { next?: string | null; intent?: ListAuthIntent | null },
): string {
  const intent = opts.intent ?? null;
  let next = safeNextPath(opts.next ?? null);
  if (intent && next) {
    next = withListAuthIntent(next, intent);
  }
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (intent) params.set("intent", intent);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Where to send the user after successful sign-in or sign-up.
 * Falls back to `/account` when `next` is missing or unsafe.
 */
export function resolvePostAuthRedirect(
  nextRaw: unknown,
  intentRaw: unknown = null,
): string {
  const intent = parseListAuthIntent(intentRaw);
  let next = safeNextPath(String(nextRaw ?? "")) ?? "/account";
  if (intent) {
    next = withListAuthIntent(next, intent);
  }
  return next;
}

/** Current path for nav Sign in — omit when already on auth pages. */
export function returnPathFromLocation(
  pathname: string,
  search: string,
): string | null {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  if (pathname.startsWith("/auth/") || pathname === "/auth") return null;
  const q = search.startsWith("?")
    ? search.slice(1)
    : search.replace(/^\?/, "");
  return q ? `${pathname}?${q}` : pathname;
}
