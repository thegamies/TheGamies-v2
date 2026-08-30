export const AUTH_EMAIL_FROM_DEFAULT = "The Gamies <noreply@thegamies.gg>";
export const AUTH_EMAIL_HOME_URL = "https://thegamies.gg";

/** Neon Auth documented windows when the webhook omits `expires_at`. */
export const AUTH_EMAIL_VALIDITY_MINUTES = {
  recovery: 15,
  confirmation: 15,
  "email-change": 15,
  "sign-in": 5,
} as const;

export const AUTH_EMAIL_SUBJECTS = {
  recovery: "Reset your The Gamies password",
  confirmation: "Confirm your The Gamies account",
  emailChange: "Confirm your email change for The Gamies",
  signIn: "Sign in to The Gamies",
} as const;

export type AuthEmailKind =
  | "recovery"
  | "confirmation"
  | "email-change"
  | "sign-in";
