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

export function envAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
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
    return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    return configured;
  }
}
