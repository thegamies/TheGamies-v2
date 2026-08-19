/**
 * Local `next dev` cannot send Neon Auth mail. Skip confirm-email only there.
 * Hosted deploys (Vercel / Cloudflare, including previews) still require it.
 */
export function skipEmailVerification(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.VERCEL || env.VERCEL_ENV || env.CF_PAGES) return false;
  return env.NODE_ENV === "development";
}
