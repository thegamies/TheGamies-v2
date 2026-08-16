/** Post-auth list Save / Share completion intents. */

export type ListAuthIntent = "save" | "share";

/** Share-with-link publish requires an owned profile (no new anon `/l/` rows). */
export function shareLinkPublishError(
  profileId: string | null | undefined,
): string | null {
  if (!profileId) return "Sign in to publish a share link.";
  return null;
}

export function parseListAuthIntent(raw: unknown): ListAuthIntent | null {
  if (raw === "save" || raw === "share") return raw;
  return null;
}

/** Append or replace `intent` on a same-origin relative path. */
export function withListAuthIntent(
  path: string,
  intent: ListAuthIntent,
): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return trimmed;
  const q = trimmed.indexOf("?");
  const pathname = q >= 0 ? trimmed.slice(0, q) : trimmed;
  const search = q >= 0 ? trimmed.slice(q + 1) : "";
  const params = new URLSearchParams(search);
  params.set("intent", intent);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Strip `intent` from a relative path (after completion). */
export function withoutListAuthIntent(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return trimmed;
  const q = trimmed.indexOf("?");
  if (q < 0) return trimmed;
  const pathname = trimmed.slice(0, q);
  const params = new URLSearchParams(trimmed.slice(q + 1));
  params.delete("intent");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

import { buildSignInHref } from "@/lib/auth/return-to";

export function buildListSignInHref(
  returnPath: string,
  intent: ListAuthIntent,
): string {
  return buildSignInHref({ next: returnPath, intent });
}
