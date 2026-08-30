export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HELPER =
  "At least 8 characters with one letter and one number.";

export const PASSWORD_RESET_SENT =
  "If an account exists for that email, we sent a password reset link.";

export const PASSWORD_RESET_UPDATED =
  "Your password was updated. Sign in with your new password.";

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: PASSWORD_HELPER };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, message: PASSWORD_HELPER };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: PASSWORD_HELPER };
  }
  return { ok: true };
}

export function passwordsMatch(
  password: string,
  confirm: string,
): boolean {
  return password === confirm;
}
