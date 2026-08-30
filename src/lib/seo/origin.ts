import { headers } from "next/headers";

export function isLocalHost(hostOrOrigin: string): boolean {
  const value = hostOrOrigin.trim().toLowerCase();
  const host = value.includes("://")
    ? (() => {
        try {
          return new URL(value).hostname;
        } catch {
          return value;
        }
      })()
    : value.split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Normalize a configured or request origin into `https://host` (or http for
 * loopback). Bare hostnames get https. Invalid values become "".
 */
export function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return "";
  }
}

export function envAppOrigin(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "");
}

/** Prefer a public configured origin; fall back to the request host (preview). */
export async function resolvePublicOrigin(): Promise<string> {
  const configured = envAppOrigin();
  if (configured && !isLocalHost(configured)) return configured;

  try {
    const h = await headers();
    const raw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const host = raw.split(",")[0]?.trim();
    if (!host) return configured;
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (isLocalHost(host) ? "http" : "https");
    return normalizeOrigin(`${proto}://${host}`) || configured;
  } catch {
    return configured;
  }
}
