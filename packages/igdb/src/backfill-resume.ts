import { MAX_PAGES_PER_RUN } from "./sync-constants";

export type BackfillResumeRow = {
  status: string;
  pages: number;
  lastIgdbId: number | null;
  scope: {
    maxPages?: number;
    truncated?: boolean;
  } | null;
};

/**
 * Pure resume rules for backfill — used by DB lookup and unit tests.
 */
export function evaluateBackfillResume(
  row: BackfillResumeRow | null | undefined,
  options: { year?: number | null; defaultMaxPages?: number } = {},
): {
  afterId: number;
  canContinue: boolean;
  year: number | null;
} {
  const year = options.year ?? null;
  if (!row?.lastIgdbId) {
    return { afterId: 0, canContinue: false, year };
  }

  const pageCap =
    typeof row.scope?.maxPages === "number"
      ? row.scope.maxPages
      : (options.defaultMaxPages ?? MAX_PAGES_PER_RUN);
  const hitCap = row.pages >= pageCap || row.scope?.truncated === true;
  const unfinished =
    row.status === "error" || row.status === "running" || hitCap;

  if (!unfinished) {
    return { afterId: 0, canContinue: false, year };
  }

  return { afterId: row.lastIgdbId, canContinue: true, year };
}
