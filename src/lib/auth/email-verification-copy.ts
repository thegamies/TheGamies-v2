import { AUTH_EMAIL_VALIDITY_MINUTES } from "@/lib/email/copy";

export const VERIFY_EMAIL_HEADING = "Confirm your email";

export const VERIFY_EMAIL_INTRO = `We sent a confirmation link to this address. It is valid for ${AUTH_EMAIL_VALIDITY_MINUTES.confirmation} minutes.`;

export const VERIFY_EMAIL_SENT = "Open the confirmation link in your email.";

export const VERIFY_EMAIL_RESENT =
  "We sent another confirmation link to that address.";

export const VERIFY_EMAIL_SEND_FAILED =
  "Could not send another confirmation email. Try again.";

type AuthClientError = {
  message?: string;
  code?: string;
} | null | undefined;

function parsedAuthClientError(error: AuthClientError): {
  message?: string;
  code?: string;
} | null {
  if (!error) return null;
  const raw = error.message?.trim() ?? "";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { message?: string; code?: string };
      return {
        message: parsed.message ?? error.message,
        code: parsed.code ?? error.code,
      };
    } catch {
      return error;
    }
  }
  return error;
}

/** Product copy for Auth API failures — never dump JSON or origin-check codes. */
export function publicAuthErrorMessage(
  error: AuthClientError,
  fallback: string,
): string {
  const parsed = parsedAuthClientError(error);
  const code = parsed?.code?.toUpperCase() ?? "";
  if (
    code.includes("INVALID_REDIRECT") ||
    code.includes("INVALID_CALLBACK") ||
    code.includes("INVALID_ORIGIN")
  ) {
    return fallback;
  }
  const message = parsed?.message?.trim() ?? "";
  if (!message || message.startsWith("{")) return fallback;
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid redirect") ||
    lower.includes("invalid callback") ||
    lower.includes("invalid origin")
  ) {
    return fallback;
  }
  return message;
}

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
