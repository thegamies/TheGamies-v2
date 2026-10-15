/**
 * Sent on every response (see `next.config.ts`). Kept minimal on purpose:
 * no script/source allowlist, so AdSense, Analytics, and embeds are never
 * blocked. See `docs/hardening-plan.md` step 6.
 */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];
