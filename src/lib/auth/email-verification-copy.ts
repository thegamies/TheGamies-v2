import { AUTH_EMAIL_VALIDITY_MINUTES } from "@/lib/email/copy";

export const VERIFY_EMAIL_HEADING = "Confirm your email";

export const VERIFY_EMAIL_INTRO = `We sent a confirmation link to this address. It is valid for ${AUTH_EMAIL_VALIDITY_MINUTES.confirmation} minutes. You can also enter the code from the email.`;

export const VERIFY_EMAIL_SENT =
  "Open the confirmation link in your email, or enter the code here.";

export const VERIFY_EMAIL_RESENT = "We sent another code to that address.";

export const VERIFY_EMAIL_INVALID =
  "That code did not work. Try again or send a new one.";

export const VERIFY_EMAIL_MISSING = "Enter the code from your email.";

export const VERIFY_EMAIL_SIGN_IN =
  "Confirm the code from your email, then sign in.";

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
