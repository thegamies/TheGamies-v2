/** Days after `publishesAt` during which the spoiler-safe entrance may show. */
export const EDITION_RESULTS_ENTRANCE_WINDOW_DAYS = 30;

const STORAGE_PREFIX = "tg_edition_results_entrance:";
const PREFERENCE_VALUE = "results";

export function editionResultsEntranceStorageKey(
  slug: string,
  year: number,
): string {
  return `${STORAGE_PREFIX}${slug}:${year}`;
}

/**
 * True while the spoiler-safe landing may still show for this publish time.
 * After the window, bare URLs go straight to Results.
 */
export function isEditionResultsEntranceOpen(
  publishesAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!publishesAt || Number.isNaN(publishesAt.getTime())) return false;
  const ends = new Date(publishesAt.getTime());
  ends.setUTCDate(ends.getUTCDate() + EDITION_RESULTS_ENTRANCE_WINDOW_DAYS);
  return now.getTime() < ends.getTime();
}

export function hasEditionResultsEntrancePreference(
  slug: string,
  year: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(
        editionResultsEntranceStorageKey(slug, year),
      ) === PREFERENCE_VALUE
    );
  } catch {
    return false;
  }
}

/** Remember skip / reveal-complete so future bare visits go to Results. */
export function markEditionResultsEntranceSeen(
  slug: string,
  year: number,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      editionResultsEntranceStorageKey(slug, year),
      PREFERENCE_VALUE,
    );
  } catch {
    // ignore quota / private mode
  }
}
