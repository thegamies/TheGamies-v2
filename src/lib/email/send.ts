import { buildVerifyEmailAbsoluteHref } from "@/lib/auth/return-to";
import { AUTH_EMAIL_FROM_DEFAULT, AUTH_EMAIL_SUBJECTS } from "./copy";
import type { NeonAuthEmailPayload } from "./neon-webhook";
import {
  confirmationText,
  emailChangeText,
  recoveryText,
  renderConfirmationEmail,
  renderEmailChangeEmail,
  renderRecoveryEmail,
  renderSignInEmail,
  signInText,
} from "./templates";

export type AuthEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function authEmailFromAddress(): string {
  return process.env.AUTH_EMAIL_FROM?.trim() || AUTH_EMAIL_FROM_DEFAULT;
}

export function buildAuthEmail(
  payload: NeonAuthEmailPayload,
  options: { origin?: string } = {},
): AuthEmailMessage | null {
  const to = payload.user?.email?.trim();
  if (!to) return null;
  const data = payload.event_data ?? {};
  const expiresAt = data.expires_at;

  if (payload.event_type === "send.otp") {
    const code = data.otp_code?.trim();
    if (!code) return null;
    if (data.otp_type === "forget-password") {
      return {
        to,
        subject: AUTH_EMAIL_SUBJECTS.recovery,
        html: renderRecoveryEmail({ code, expiresAt }),
        text: recoveryText({ code, expiresAt }),
      };
    }
    if (data.otp_type === "email-verification") {
      const href = options.origin
        ? buildVerifyEmailAbsoluteHref(options.origin, { email: to, otp: code })
        : null;
      return {
        to,
        subject: AUTH_EMAIL_SUBJECTS.confirmation,
        html: renderConfirmationEmail({
          href: href ?? undefined,
          code: href ? undefined : code,
          expiresAt,
        }),
        text: confirmationText({
          href: href ?? undefined,
          code: href ? undefined : code,
          expiresAt,
        }),
      };
    }
    return {
      to,
      subject: AUTH_EMAIL_SUBJECTS.signIn,
      html: renderSignInEmail({ code, expiresAt }),
      text: signInText({ code, expiresAt }),
    };
  }

  if (payload.event_type === "send.magic_link") {
    const href = data.link_url?.trim();
    if (!href) return null;
    if (data.link_type === "forget-password") {
      return {
        to,
        subject: AUTH_EMAIL_SUBJECTS.recovery,
        html: renderRecoveryEmail({ href, expiresAt }),
        text: recoveryText({ href, expiresAt }),
      };
    }
    if (data.link_type === "email-verification") {
      const currentEmail = data.current_email?.trim();
      const newEmail = data.new_email?.trim();
      if (currentEmail && newEmail) {
        return {
          to,
          subject: AUTH_EMAIL_SUBJECTS.emailChange,
          html: renderEmailChangeEmail({
            href,
            currentEmail,
            newEmail,
            expiresAt,
          }),
          text: emailChangeText({
            href,
            currentEmail,
            newEmail,
            expiresAt,
          }),
        };
      }
      return {
        to,
        subject: AUTH_EMAIL_SUBJECTS.confirmation,
        html: renderConfirmationEmail({ href, expiresAt }),
        text: confirmationText({ href, expiresAt }),
      };
    }
    return {
      to,
      subject: AUTH_EMAIL_SUBJECTS.signIn,
      html: renderSignInEmail({ href, expiresAt }),
      text: signInText({ href, expiresAt }),
    };
  }

  return null;
}

export async function sendAuthEmail(message: AuthEmailMessage): Promise<void> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const binding = env.EMAIL;
  if (!binding?.send) {
    throw new Error("email-binding");
  }
  await binding.send({
    from: authEmailFromAddress(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}
