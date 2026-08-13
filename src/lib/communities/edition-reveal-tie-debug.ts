import type { EditionCategoryStandingBlock } from "@/lib/communities/edition-results";
import { groupByRank } from "@/lib/standings/shared-rank";

/** Soft ceiling so a typo cannot mount thousands of covers. */
export const REVEAL_TIE_REPEAT_MAX = 40;
export const REVEAL_TIE_CAP_MAX = 48;

export const REVEAL_TIE_REPEAT_OPTIONS = [1, 2, 4, 8, 16, 32] as const;

export function isEditionRevealTieDebugEnabled(
  env: { nodeEnv?: string | null } = {},
): boolean {
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "development";
}

/**
 * @deprecated Prefer debug UI controls — kept for tests / one-off scripts.
 * Ignored outside development — always returns 1 in production.
 */
export function parseRevealTieRepeat(
  raw: string | undefined | null,
  env: { nodeEnv?: string | null } = {},
): number {
  if (!isEditionRevealTieDebugEnabled(env)) return 1;
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 2) return 1;
  return Math.min(REVEAL_TIE_REPEAT_MAX, Math.floor(n));
}

export function clampRevealTieRepeat(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(REVEAL_TIE_REPEAT_MAX, Math.floor(n));
}

/** 0 = no cap. */
export function clampRevealTieCap(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(REVEAL_TIE_CAP_MAX, Math.floor(n));
}

/**
 * Truncate each derived-rank group to at most `maxPerRank` games
 * so stress tests can thin a crowded mosaic without dropping ranks.
 */
export function limitEditionCategoryRanksForDebug(
  blocks: EditionCategoryStandingBlock[],
  maxPerRank: number,
): EditionCategoryStandingBlock[] {
  const cap = clampRevealTieCap(maxPerRank);
  if (cap <= 0) return blocks;

  return blocks.map((block) => {
    const groups = groupByRank(block.rows);
    const rows = groups.flatMap((group) => group.rows.slice(0, cap));
    return { ...block, rows };
  });
}

/**
 * Clone every game in each derived-rank group `times` times so crowded
 * category Reveal layouts can be checked without a wild freeze.
 */
export function repeatEditionCategoryRanksForDebug(
  blocks: EditionCategoryStandingBlock[],
  times: number,
): EditionCategoryStandingBlock[] {
  const n = clampRevealTieRepeat(times);
  if (n <= 1) return blocks;

  return blocks.map((block) => {
    const groups = groupByRank(block.rows);
    const rows = groups.flatMap((group) =>
      Array.from({ length: n }, (_, copy) =>
        group.rows.map((row) => ({
          ...row,
          // Unique keys for React / links; not real catalog ids.
          gameId: `${row.gameId}__tie${copy}`,
          slug: `${row.slug}--tie${copy}`,
          title: copy === 0 ? row.title : `${row.title} (${copy + 1})`,
        })),
      ).flat(),
    );
    return { ...block, rows };
  });
}

/** Cap per rank first (optional), then repeat ranks — local stress-test only. */
export function applyEditionCategoryRevealDebug(
  blocks: EditionCategoryStandingBlock[],
  opts: { repeat?: number; maxPerRank?: number } = {},
): EditionCategoryStandingBlock[] {
  const capped = limitEditionCategoryRanksForDebug(
    blocks,
    opts.maxPerRank ?? 0,
  );
  return repeatEditionCategoryRanksForDebug(capped, opts.repeat ?? 1);
}
