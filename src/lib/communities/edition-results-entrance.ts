/** Days after `publishesAt` during which the spoiler-safe entrance may show. */
export const EDITION_RESULTS_ENTRANCE_WINDOW_DAYS = 30;

const STORAGE_PREFIX = "tg_edition_results_entrance:";
const PREFERENCE_VALUE = "results";

/** Readable by the Events page so Results can SSR after the first choice. */
export const ENTRANCE_PREF_COOKIE = "tg_ed_res";

const COOKIE_MAX_TOKENS = 40;
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export function editionResultsEntranceStorageKey(
  slug: string,
  year: number,
): string {
  return `${STORAGE_PREFIX}${slug}:${year}`;
}

export function entrancePrefCookieToken(slug: string, year: number): string {
  return `${encodeURIComponent(slug)}:${year}`;
}

export function hasEditionResultsEntrancePreferenceCookie(
  cookieValue: string | undefined | null,
  slug: string,
  year: number,
): boolean {
  if (!cookieValue) return false;
  const token = entrancePrefCookieToken(slug, year);
  return cookieValue.split("|").includes(token);
}

export function mergeEntrancePrefCookieValue(
  existing: string | undefined | null,
  slug: string,
  year: number,
): string {
  const token = entrancePrefCookieToken(slug, year);
  const parts = (existing ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.includes(token)) parts.push(token);
  return parts.slice(-COOKIE_MAX_TOKENS).join("|");
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

function readDocumentCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const found = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function writeDocumentCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function hasEditionResultsEntrancePreference(
  slug: string,
  year: number,
): boolean {
  if (
    hasEditionResultsEntrancePreferenceCookie(
      readDocumentCookie(ENTRANCE_PREF_COOKIE),
      slug,
      year,
    )
  ) {
    return true;
  }
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
  try {
    writeDocumentCookie(
      ENTRANCE_PREF_COOKIE,
      mergeEntrancePrefCookieValue(
        readDocumentCookie(ENTRANCE_PREF_COOKIE),
        slug,
        year,
      ),
    );
  } catch {
    // ignore cookie-blocked contexts
  }
}
