import { isLoopbackHost } from "@/lib/auth/loopback";
import { AUTH_EMAIL_FROM_DEFAULT } from "./copy";

export type AuthEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function authEmailFromAddress(): string {
  return process.env.AUTH_EMAIL_FROM?.trim() || AUTH_EMAIL_FROM_DEFAULT;
}

/** RFC 2606 / 6761 reserved names: never deliverable (QA accounts use these). */
export function isUndeliverableEmailAddress(email: string | undefined): boolean {
  const domain = email?.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  if (["example.com", "example.net", "example.org"].includes(domain)) {
    return true;
  }
  return /(^|\.)(example|invalid|test|localhost)$/.test(domain);
}

/** Email buttons and links: https only, plus plain http on loopback for local dev. */
export function isSafeEmailHref(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && isLoopbackHost(url.hostname);
  } catch {
    return false;
  }
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
