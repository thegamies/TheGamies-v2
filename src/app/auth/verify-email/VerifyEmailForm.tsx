"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  VERIFY_EMAIL_CONFIRMING,
  VERIFY_EMAIL_INVALID,
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
  /** Request a confirmation link on first paint when none was sent yet. */
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
  const [pending, setPending] = useState(
    Boolean((initialOtp ?? "").replace(/\s/g, "") && initialEmail.trim()),
  );
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);
  const codeRequested = useRef(false);
  const linkCode = (initialOtp ?? "").replace(/\s/g, "");

  async function confirm(address: string, code: string) {
    if (!address || !code) return;
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await verifyEmailOtp({
        email: address,
        otp: code,
      });
      if (verifyError) {
        setError(VERIFY_EMAIL_INVALID);
        setPending(false);
        return;
      }
      const dest = resolvePostAuthRedirect(next ?? readPostAuthNext(), intent);
      clearPostAuthNext();
      window.location.assign(dest);
    } catch {
      setError(VERIFY_EMAIL_INVALID);
      setPending(false);
    }
  }

  useEffect(() => {
    const address = initialEmail.trim();
    if (address && linkCode && !autoTried.current) {
      autoTried.current = true;
      void confirm(address, linkCode);
      return;
    }
    if (sendCodeOnMount && address && !codeRequested.current) {
      codeRequested.current = true;
      void resendEmailVerificationOtp({ email: address });
    }
    // First paint: confirm from the email link, or request a link after sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (linkCode && pending && !error) {
    return (
      <p className="mt-10 text-sm text-muted" role="status">
        {VERIFY_EMAIL_CONFIRMING}
      </p>
    );
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
