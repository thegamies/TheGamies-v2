import { AUTH_EMAIL_VALIDITY_MINUTES } from "@/lib/email/copy";

export const VERIFY_EMAIL_HEADING = "Confirm your email";

export const VERIFY_EMAIL_INTRO = `We sent a confirmation link to this address. It is valid for ${AUTH_EMAIL_VALIDITY_MINUTES.confirmation} minutes.`;

export const VERIFY_EMAIL_SENT = "Open the confirmation link in your email.";

export const VERIFY_EMAIL_RESENT =
  "We sent another confirmation link to that address.";

export const VERIFY_EMAIL_INVALID =
  "That confirmation link did not work. Send a new one.";

export const VERIFY_EMAIL_CONFIRMING = "Confirming your email…";

export function isUnverifiedEmailError(error: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!error) return false;
  const code = error.code?.toUpperCase() ?? "";
  if (code.includes("EMAIL_NOT_VERIFIED") || code.includes("UNVERIFIED")) {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("not verified") ||
    message.includes("verify your email") ||
    message.includes("email verification")
  );
}
