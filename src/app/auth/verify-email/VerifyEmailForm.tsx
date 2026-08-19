"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  VERIFY_EMAIL_INVALID,
  VERIFY_EMAIL_MISSING,
  VERIFY_EMAIL_RESENT,
  VERIFY_EMAIL_SENT,
} from "@/lib/auth/email-verification-copy";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";
import {
  resendEmailVerificationOtp,
  verifyEmailOtp,
} from "@/lib/auth/verify-email-client";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

type Props = {
  email: string;
  next?: string | null;
  intent?: string | null;
  allowEmailEdit?: boolean;
};

export function VerifyEmailForm({
  email: initialEmail,
  next,
  intent,
  allowEmailEdit = false,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onVerify(formData: FormData) {
    const address = String(formData.get("email") ?? email).trim();
    const otp = String(formData.get("otp") ?? "").replace(/\s/g, "");
    if (!address) return;
    if (!otp) {
      setError(VERIFY_EMAIL_MISSING);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await verifyEmailOtp({
        email: address,
        otp,
      });
      if (verifyError) {
        setError(VERIFY_EMAIL_INVALID);
        return;
      }
      window.location.assign(resolvePostAuthRedirect(next, intent));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    const address = email.trim();
    if (!address) return;
    setPending(true);
    setError(null);
    try {
      await resendEmailVerificationOtp({ email: address });
      setResent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onVerify} className="mt-10 space-y-4">
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
        <input type="hidden" name="email" value={email} />
      )}
      {!allowEmailEdit && initialEmail ? (
        <p className="text-sm text-ink">{email}</p>
      ) : null}
      <label className="block text-sm text-muted">
        Confirmation code
        <input
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          className={fieldClass}
        />
      </label>
      <p className="text-sm text-muted" role="status">
        {resent ? VERIFY_EMAIL_RESENT : VERIFY_EMAIL_SENT}
      </p>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Confirming…" : "Confirm email"}
      </Button>
      <Button
        type="button"
        variant="quiet"
        disabled={pending}
        className="w-full"
        onClick={onResend}
      >
        Send another code
      </Button>
    </form>
  );
}
