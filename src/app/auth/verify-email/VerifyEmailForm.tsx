"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  VERIFY_EMAIL_RESENT,
  VERIFY_EMAIL_SEND_FAILED,
  VERIFY_EMAIL_SENT,
} from "@/lib/auth/email-verification-copy";
import { readPostAuthNext } from "@/lib/auth/post-auth-next";
import {
  buildEmailConfirmedCallbackUrl,
  resolvePostAuthRedirect,
} from "@/lib/auth/return-to";
import { sendVerificationLink } from "@/lib/auth/verify-email-client";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

type Props = {
  email: string;
  next?: string | null;
  intent?: string | null;
  allowEmailEdit?: boolean;
  /** Request a confirmation link on first paint (unverified sign-in). */
  sendOnMount?: boolean;
};

function callbackURL(next: string | null | undefined, intent: string | null | undefined) {
  const dest = resolvePostAuthRedirect(next ?? readPostAuthNext(), intent);
  return (
    buildEmailConfirmedCallbackUrl(window.location.origin, dest) ??
    `${window.location.origin}/auth/confirmed`
  );
}

export function VerifyEmailForm({
  email: initialEmail,
  next,
  intent,
  allowEmailEdit = false,
  sendOnMount = false,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  async function sendLink(address: string) {
    if (!address) return false;
    const { error: sendError } = await sendVerificationLink({
      email: address,
      callbackURL: callbackURL(next, intent),
    });
    return !sendError;
  }

  useEffect(() => {
    const address = initialEmail.trim();
    if (sendOnMount && address && !requested.current) {
      requested.current = true;
      void sendLink(address);
    }
    // First paint: request a link after unverified sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onResend() {
    const address = email.trim();
    if (!address) return;
    setPending(true);
    setError(null);
    try {
      const sent = await sendLink(address);
      if (sent) {
        setResent(true);
      } else {
        setError(VERIFY_EMAIL_SEND_FAILED);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-10 space-y-4">
      {allowEmailEdit || !initialEmail ? (
        <label className="block text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
      ) : (
        <p className="text-sm text-ink">{email}</p>
      )}
      <p className="text-sm text-muted" role="status">
        {resent ? VERIFY_EMAIL_RESENT : VERIFY_EMAIL_SENT}
      </p>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <Button
        type="button"
        disabled={pending || !email.trim()}
        className="w-full"
        onClick={onResend}
      >
        {pending ? "Sending…" : "Send another email"}
      </Button>
    </div>
  );
}
