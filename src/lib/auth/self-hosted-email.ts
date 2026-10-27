import { PASSWORD_RESET_PATH } from "@/lib/auth/return-to";
import { safeNextPath } from "@/lib/auth/safe-next";
import { AUTH_EMAIL_SUBJECTS } from "@/lib/email/copy";
import {
  confirmationText,
  recoveryText,
  renderConfirmationEmail,
  renderRecoveryEmail,
} from "@/lib/email/templates";
import {
  isSafeEmailHref,
  isUndeliverableEmailAddress,
  sendAuthEmail,
} from "@/lib/email/send";

/**
 * Better Auth verification URLs hit `/api/auth/verify-email`. Rewrite to the
 * in-app confirm page so the client can verify over XHR and store the cookie.
 */
export function confirmationPageHrefFromToken(input: {
  appOrigin: string;
  token: string;
  callbackURL?: string | null;
}): string {
  const appOrigin = input.appOrigin.replace(/\/$/, "");
  const next = nextFromCallback(input.callbackURL, appOrigin);
  return `${appOrigin}/auth/confirmed?token=${encodeURIComponent(input.token)}&next=${encodeURIComponent(next)}`;
}

/** Leave the reset token unused for the in-app form (same as Neon rewrite). */
export function resetPasswordPageHrefFromToken(input: {
  appOrigin: string;
  token: string;
}): string {
  const appOrigin = input.appOrigin.replace(/\/$/, "");
  return `${appOrigin}${PASSWORD_RESET_PATH}?token=${encodeURIComponent(input.token)}`;
}

function nextFromCallback(
  callback: string | null | undefined,
  appOrigin: string,
): string {
  if (!callback) return "/account";
  try {
    const url = callback.startsWith("/")
      ? new URL(callback, appOrigin)
      : new URL(callback);
    const fromQuery = safeNextPath(url.searchParams.get("next"));
    if (fromQuery) return fromQuery;
    if (url.pathname.startsWith("/auth/")) return "/account";
    return safeNextPath(`${url.pathname}${url.search}`) ?? "/account";
  } catch {
    return "/account";
  }
}

export async function sendSelfHostedVerificationEmail(input: {
  email: string;
  url: string;
  token: string;
  appOrigin: string;
}): Promise<void> {
  if (isUndeliverableEmailAddress(input.email)) return;

  let callbackURL: string | null = null;
  try {
    callbackURL = new URL(input.url).searchParams.get("callbackURL");
  } catch {
    callbackURL = null;
  }

  const href = confirmationPageHrefFromToken({
    appOrigin: input.appOrigin,
    token: input.token,
    callbackURL,
  });
  if (!isSafeEmailHref(href)) return;

  await sendAuthEmail({
    to: input.email,
    subject: AUTH_EMAIL_SUBJECTS.confirmation,
    html: renderConfirmationEmail({ href }),
    text: confirmationText({ href }),
  });
}

export async function sendSelfHostedResetPasswordEmail(input: {
  email: string;
  token: string;
  appOrigin: string;
}): Promise<void> {
  if (isUndeliverableEmailAddress(input.email)) return;

  const href = resetPasswordPageHrefFromToken({
    appOrigin: input.appOrigin,
    token: input.token,
  });
  if (!isSafeEmailHref(href)) return;

  await sendAuthEmail({
    to: input.email,
    subject: AUTH_EMAIL_SUBJECTS.recovery,
    html: renderRecoveryEmail({ href }),
    text: recoveryText({ href }),
  });
}
