import {
  AUTH_EMAIL_HOME_URL,
  AUTH_EMAIL_VALIDITY_MINUTES,
  type AuthEmailKind,
} from "./copy";

const PAPER = "#0d0d0e";
const PANEL = "#151516";
const INK = "#f4f0e8";
const MUTED = "#aaa69e";
const LINE = "#2b2a28";
const ACCENT = "#ff5a1f";

export function renderAuthEmailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>The Gamies</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${PAPER};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${AUTH_EMAIL_HOME_URL}" style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:0.04em;line-height:1.2;color:${INK};text-decoration:none;">
                The Gamies
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:${PANEL};border-radius:2px;border:1px solid ${LINE};padding:32px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED};">
                Need help? Visit <a href="${AUTH_EMAIL_HOME_URL}" style="color:${ACCENT};text-decoration:none;">The Gamies</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">
                &copy; The Gamies. You received this because of activity on your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:${INK};">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${MUTED};">${text}</p>`;
}

function footnote(text: string): string {
  return `<p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">${text}</p>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr>
    <td align="center" style="border-radius:2px;background-color:${ACCENT};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:2px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

function codeBlock(code: string): string {
  return `<p style="margin:0 0 24px;font-size:28px;letter-spacing:0.2em;font-weight:700;color:${INK};">${escapeHtml(code)}</p>`;
}

export function expirySentence(
  expiresAt: string | undefined,
  kind: "link" | "code",
  fallbackMinutes: number,
): string {
  let minutes = fallbackMinutes;
  if (expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (Number.isFinite(ms) && ms > 0) {
      minutes = Math.max(1, Math.round(ms / 60_000));
    }
  }
  return `This ${kind} is valid for ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function expiryForKind(
  expiresAt: string | undefined,
  emailKind: AuthEmailKind,
  tokenKind: "link" | "code",
): string {
  return expirySentence(
    expiresAt,
    tokenKind,
    AUTH_EMAIL_VALIDITY_MINUTES[emailKind],
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderRecoveryEmail(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "recovery",
    input.code ? "code" : "link",
  );
  const intro = input.code
    ? "We received a request to reset the password for your The Gamies account. Enter this code to choose a new password."
    : "We received a request to reset the password for your The Gamies account. Click the button below to choose a new password.";
  const action = input.code
    ? codeBlock(input.code)
    : input.href
      ? ctaButton(input.href, "Reset password")
      : "";
  const body = `
${heading("Reset your password")}
${para(intro)}
${action}
${footnote(`${expiry} If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password won&rsquo;t change.`)}
`;
  return renderAuthEmailLayout(body.trim());
}

export function renderConfirmationEmail(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "confirmation",
    input.code ? "code" : "link",
  );
  const action = input.code
    ? codeBlock(input.code)
    : input.href
      ? ctaButton(input.href, "Confirm email")
      : "";
  const body = `
${heading("Confirm your email")}
${para("Thanks for signing up for The Gamies. Confirm your email address to finish creating your account and start ranking games.")}
${action}
${footnote(`${expiry} If you didn&rsquo;t create a The Gamies account, you can safely ignore this email.`)}
`;
  return renderAuthEmailLayout(body.trim());
}

export function renderEmailChangeEmail(input: {
  href: string;
  currentEmail: string;
  newEmail: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(input.expiresAt, "email-change", "link");
  const body = `
${heading("Confirm your email change")}
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${MUTED};">
  We received a request to change the sign-in email for your The Gamies account from
  <span style="color:${INK};">${escapeHtml(input.currentEmail)}</span> to
  <span style="color:${INK};">${escapeHtml(input.newEmail)}</span>.
</p>
${para("Click the button below to confirm this change.")}
${ctaButton(input.href, "Confirm email change")}
${footnote(`${expiry} If you didn&rsquo;t request an email change, you can safely ignore this email. Your account email won&rsquo;t change.`)}
`;
  return renderAuthEmailLayout(body.trim());
}

export function renderSignInEmail(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "sign-in",
    input.code ? "code" : "link",
  );
  const action = input.code
    ? codeBlock(input.code)
    : input.href
      ? ctaButton(input.href, "Sign in")
      : "";
  const body = `
${heading("Sign in to The Gamies")}
${para("Use the button below to sign in to your account.")}
${action}
${footnote(`${expiry} If you didn&rsquo;t try to sign in, you can safely ignore this email.`)}
`;
  return renderAuthEmailLayout(body.trim());
}

export function recoveryText(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "recovery",
    input.code ? "code" : "link",
  );
  if (input.code) {
    return `Reset your The Gamies password.\n\nYour code: ${input.code}\n\n${expiry}`;
  }
  return `Reset your The Gamies password.\n\n${input.href ?? ""}\n\n${expiry}`;
}

export function confirmationText(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "confirmation",
    input.code ? "code" : "link",
  );
  if (input.code) {
    return `Confirm your The Gamies email.\n\nYour code: ${input.code}\n\n${expiry}`;
  }
  return `Confirm your The Gamies email.\n\n${input.href ?? ""}\n\n${expiry}`;
}

export function signInText(input: {
  href?: string;
  code?: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(
    input.expiresAt,
    "sign-in",
    input.code ? "code" : "link",
  );
  if (input.code) {
    return `Sign in to The Gamies.\n\nYour code: ${input.code}\n\n${expiry}`;
  }
  return `Sign in to The Gamies.\n\n${input.href ?? ""}\n\n${expiry}`;
}

export function emailChangeText(input: {
  href: string;
  currentEmail: string;
  newEmail: string;
  expiresAt?: string;
}): string {
  const expiry = expiryForKind(input.expiresAt, "email-change", "link");
  return `Confirm your email change from ${input.currentEmail} to ${input.newEmail}.\n\n${input.href}\n\n${expiry}`;
}
