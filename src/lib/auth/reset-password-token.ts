import { PASSWORD_RESET_PATH } from "@/lib/auth/return-to";

/**
 * Neon reset links put the token in the path (`/reset-password/:token`),
 * not always `?token=`. Hitting `/api/auth/reset-password/:token` as GET
 * consumes it before the form can POST.
 */
export function tokenFromResetPasswordSegments(
  segments: readonly string[],
): string | null {
  const index = segments.findIndex((part) => part === "reset-password");
  if (index < 0) return null;
  const token = segments[index + 1]?.trim();
  return token || null;
}

export function tokenFromResetPasswordHref(
  href: string,
  fallbackToken?: string | null,
): string | null {
  const fromPayload = fallbackToken?.trim();
  if (fromPayload) return fromPayload;
  try {
    const url = new URL(href, "https://thegamies.invalid");
    const fromQuery = url.searchParams.get("token")?.trim();
    if (fromQuery) return fromQuery;
    return tokenFromResetPasswordSegments(
      url.pathname.split("/").filter(Boolean),
    );
  } catch {
    return null;
  }
}

export function resetPasswordFormPath(token: string): string {
  return `${PASSWORD_RESET_PATH}?token=${encodeURIComponent(token)}`;
}
