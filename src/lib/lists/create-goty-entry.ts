/** Which create/GOTY surface to show given URL + session flags. */

export type CreateGotyEntryMode =
  | "load-by-id"
  | "anon-resume"
  | "auth-intent"
  | "signed-in-year"
  | "anon-year"
  | "chooser";

/**
 * Priority matters: auth-intent must beat signed-in year picker, or Save →
 * create account returns to an empty year form instead of the draft editor.
 */
export function createGotyEntryMode(input: {
  publicId?: string | null;
  signedIn: boolean;
  resume: boolean;
  authIntent: boolean;
  yearParam?: string | null;
}): CreateGotyEntryMode {
  if (input.publicId) return "load-by-id";
  if (!input.signedIn && input.resume) return "anon-resume";
  if (input.signedIn && input.authIntent) return "auth-intent";
  if (input.signedIn && !input.resume) return "signed-in-year";
  if (!input.signedIn && input.yearParam) return "anon-year";
  return "chooser";
}
