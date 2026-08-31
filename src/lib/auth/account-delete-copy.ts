/** Shown when Neon Auth still holds the email after the Gamies profile is closed. */
export const SIGN_IN_CLOSE_FAILED =
  "Could not close the sign-in for this account.";

/** Generic failure when delete cannot finish or the request is rejected. */
export const ACCOUNT_DELETE_FAILED = "Could not delete this account.";

/** Google-only (and other passwordless) accounts must set a password first. */
export const ACCOUNT_DELETE_NEEDS_PASSWORD =
  "This account does not have a password yet. Use Forgot password to set one, then come back here to delete your account.";
