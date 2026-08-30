/** Which create/GOTY surface to show given URL + session flags. */

export type CreateGotyEntryMode =
  | "load-by-id"
  | "anon-resume"
  | "auth-intent"
  | "signed-in-year"
  | "anon-year"
  | "chooser";

/**
 * Unsigned GOTY drafts stay on-device. After sign-in, if that year is already
 * owned, drop the local ranking instead of restoring or claiming it.
 */
export function shouldDiscardLocalGotyDraft(input: {
  signedIn: boolean;
  draftIsGoty: boolean;
  draftYear: number | null | undefined;
  accountHasGotyForYear: boolean;
}): boolean {
  return (
    input.signedIn &&
    input.draftIsGoty &&
    input.draftYear != null &&
    Number.isFinite(input.draftYear) &&
    input.accountHasGotyForYear
  );
}

/** Year on a client/save payload when it is a GOTY ranking. */
export function clientDraftGotyYear(draft: unknown): number | null {
  if (!draft || typeof draft !== "object") return null;
  const data = draft as { listType?: unknown; year?: unknown };
  if (data.listType !== "goty") return null;
  if (typeof data.year !== "number" || !Number.isFinite(data.year)) return null;
  return Math.floor(data.year);
}

/**
 * Priority matters: auth-intent must beat signed-in year picker, or Save →
 * create account returns to an empty year form instead of the draft editor.
 * An owned year for the local GOTY draft skips auth-intent restore.
 */
export function createGotyEntryMode(input: {
  publicId?: string | null;
  signedIn: boolean;
  resume: boolean;
  authIntent: boolean;
  yearParam?: string | null;
  discardLocalGotyDraft?: boolean;
}): CreateGotyEntryMode {
  if (input.publicId) return "load-by-id";
  if (!input.signedIn && input.resume) return "anon-resume";
  if (input.signedIn && input.authIntent && !input.discardLocalGotyDraft) {
    return "auth-intent";
  }
  if (input.signedIn && !input.resume) return "signed-in-year";
  if (!input.signedIn && input.yearParam) return "anon-year";
  return "chooser";
}
