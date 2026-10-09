/** Hits of the first journey path before recording. Wakes Neon / the Worker. */
export const DEFAULT_COST_WARMUP_HITS = 3;
const MAX_COST_WARMUP_HITS = 10;

/**
 * `COST_WARMUP_HITS` (default 3). `0` skips. Invalid values use the default.
 * Capped so a typo cannot stall CI.
 */
export function costWarmupHits(
  env: { COST_WARMUP_HITS?: string } = process.env,
): number {
  const raw = env.COST_WARMUP_HITS?.trim();
  if (raw == null || raw === "") return DEFAULT_COST_WARMUP_HITS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COST_WARMUP_HITS;
  return Math.min(MAX_COST_WARMUP_HITS, Math.floor(n));
}
