import { MAX_PAGES_PER_RUN } from "./sync-constants";

export type EntityResumeRow = {
  status: string;
  pages: number;
  lastIgdbId: number | null;
  scope: {
    maxPages?: number | null;
    truncated?: boolean;
    sinceUnix?: number;
    entity?: string;
    completed?: unknown;
    currentEntity?: string;
  } | null;
};

export type EntityResumeResult = {
  afterId: number;
  canContinue: boolean;
  sinceUnix: number | null;
};

function hitPageCap(
  row: EntityResumeRow,
  defaultMaxPages?: number,
): boolean {
  if (row.scope?.truncated === true) return true;
  const cap =
    typeof row.scope?.maxPages === "number"
      ? row.scope.maxPages
      : defaultMaxPages;
  if (cap == null) return false;
  return row.pages >= cap;
}

/**
 * Resume when the latest run errored, is still running, or stopped because
 * of a page cap / truncated flag. Unlimited walks (no maxPages in scope)
 * only resume from truncated or unfinished status — not from page count.
 */
export function evaluateEntityResume(
  row: EntityResumeRow | null | undefined,
  options: { defaultMaxPages?: number } = {},
): EntityResumeResult {
  const sinceUnix =
    typeof row?.scope?.sinceUnix === "number" ? row.scope.sinceUnix : null;

  if (!row?.lastIgdbId) {
    return { afterId: 0, canContinue: false, sinceUnix };
  }

  const unfinished =
    row.status === "error" ||
    row.status === "running" ||
    hitPageCap(row, options.defaultMaxPages);

  if (!unfinished) {
    return { afterId: 0, canContinue: false, sinceUnix };
  }

  return { afterId: row.lastIgdbId, canContinue: true, sinceUnix };
}

export function walkTruncated(
  pages: number,
  maxPages: number | undefined,
  lastPageFull: boolean,
): boolean {
  if (maxPages == null) return false;
  return pages >= maxPages && lastPageFull;
}

export function evaluateBackfillResumeFromEntity(
  row: EntityResumeRow | null | undefined,
  options: { year?: number | null; defaultMaxPages?: number } = {},
): {
  afterId: number;
  canContinue: boolean;
  year: number | null;
} {
  const year = options.year ?? null;
  const result = evaluateEntityResume(row, {
    defaultMaxPages: options.defaultMaxPages ?? MAX_PAGES_PER_RUN,
  });
  return { afterId: result.afterId, canContinue: result.canContinue, year };
}
