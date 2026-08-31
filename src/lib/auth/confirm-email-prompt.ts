/**
 * Neon Console "Require email verification" / confirm-email.
 * When that toggle is off, sign-up still returns emailVerified: false, but
 * Neon issues a session so the user can continue. Prompt only when they cannot.
 */
export function signUpHasSession(data: {
  session?: unknown;
  token?: unknown;
} | null | undefined): boolean {
  if (!data) return false;
  if (data.session) return true;
  return typeof data.token === "string" && data.token.length > 0;
}

export function shouldPromptConfirmEmail(input: {
  emailVerified?: boolean | null;
  hasSession: boolean;
}): boolean {
  return input.emailVerified === false && !input.hasSession;
}
