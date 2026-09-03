import { headers } from "next/headers";
import { envAppOrigin, isLocalHost, normalizeOrigin } from "./origin-env";

export { envAppOrigin, isLocalHost, normalizeOrigin } from "./origin-env";

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
