"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  VERIFY_EMAIL_INVALID,
  VERIFY_EMAIL_MISSING,
  VERIFY_EMAIL_RESENT,
  VERIFY_EMAIL_SENT,
} from "@/lib/auth/email-verification-copy";
import {
  clearPostAuthNext,
  readPostAuthNext,
} from "@/lib/auth/post-auth-next";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";
import {
  resendEmailVerificationOtp,
  verifyEmailOtp,
} from "@/lib/auth/verify-email-client";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

type Props = {
  email: string;
  otp?: string | null;
  next?: string | null;
  intent?: string | null;
  allowEmailEdit?: boolean;
  /** Request a code on first paint when Neon skipped `send.otp` during sign-up. */
  sendCodeOnMount?: boolean;
};

export function VerifyEmailForm({
  email: initialEmail,
  otp: initialOtp = "",
  next,
  intent,
  allowEmailEdit = false,
  sendCodeOnMount = false,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialOtp ?? "");
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);
  const codeRequested = useRef(false);

  async function confirm(address: string, code: string) {
    if (!address) return;
    if (!code) {
      setError(VERIFY_EMAIL_MISSING);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await verifyEmailOtp({
        email: address,
        otp: code,
      });
      if (verifyError) {
        setError(VERIFY_EMAIL_INVALID);
        return;
      }
      const dest = resolvePostAuthRedirect(next ?? readPostAuthNext(), intent);
      clearPostAuthNext();
      window.location.assign(dest);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const address = initialEmail.trim();
    const code = (initialOtp ?? "").replace(/\s/g, "");
    if (address && code && !autoTried.current) {
      autoTried.current = true;
      void confirm(address, code);
      return;
    }
    if (sendCodeOnMount && address && !codeRequested.current) {
      codeRequested.current = true;
      void resendEmailVerificationOtp({ email: address }).then(() => {
        setResent(true);
      });
    }
    // First paint: confirm from the email link, or request a code after sign-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVerify(formData: FormData) {
    const address = String(formData.get("email") ?? email).trim();
    const code = String(formData.get("otp") ?? "").replace(/\s/g, "");
    await confirm(address, code);
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
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
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
