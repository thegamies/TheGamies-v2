"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  PASSWORD_RESET_SENT,
} from "@/lib/auth/password";
import { requestPasswordResetEmail } from "@/lib/auth/password-reset-client";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    try {
      await requestPasswordResetEmail({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } finally {
      setSent(true);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-10 space-y-4">
      <label className="block text-sm text-muted">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClass}
        />
      </label>
      {sent ? (
        <p className="text-sm text-muted" role="status">
          {PASSWORD_RESET_SENT}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Forgot password
      </h1>
      <p className="mt-3 text-muted">
        Enter the email on your account. We will send a reset link if it
        matches.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/auth/sign-in" className="text-ink underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
