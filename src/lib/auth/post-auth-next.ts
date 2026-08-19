import { safeNextPath } from "@/lib/auth/safe-next";

export const POST_AUTH_NEXT_COOKIE = "tg_auth_next";
const MAX_AGE_SECONDS = 60 * 60;

function cookieSecureSuffix(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

/** Remember a safe return path across the confirm-email hop (same browser). */
export function rememberPostAuthNext(next: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const path = safeNextPath(next ?? null);
  if (!path) {
    clearPostAuthNext();
    return;
  }
  document.cookie = `${POST_AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${cookieSecureSuffix()}`;
}

export function readPostAuthNext(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${POST_AUTH_NEXT_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  try {
    return safeNextPath(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function clearPostAuthNext(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${POST_AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecureSuffix()}`;
}
