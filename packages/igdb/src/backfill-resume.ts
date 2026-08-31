import { MAX_PAGES_PER_RUN } from "./sync-constants";
import {
  evaluateBackfillResumeFromEntity,
  type EntityResumeRow,
} from "./entity-resume";

export type BackfillResumeRow = EntityResumeRow;

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
  return evaluateBackfillResumeFromEntity(row, {
    year: options.year,
    defaultMaxPages: options.defaultMaxPages ?? MAX_PAGES_PER_RUN,
  });
}
