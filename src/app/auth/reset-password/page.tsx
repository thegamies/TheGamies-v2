"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  PASSWORD_HELPER,
  passwordsMatch,
  validatePassword,
} from "@/lib/auth/password";
import { completePasswordReset } from "@/lib/auth/password-reset-client";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const parsed = validatePassword(newPassword);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setError("Does not match the other password.");
      return;
    }
    if (!token) {
      setError("This reset link is missing or expired. Request a new one.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: resetError } = await completePasswordReset({
        newPassword,
        token,
      });
      if (resetError) {
        setError("This reset link is missing or expired. Request a new one.");
        return;
      }
      router.replace("/auth/sign-in?reset=1");
    } catch {
      setError("This reset link is missing or expired. Request a new one.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-10 space-y-4">
      <label className="block text-sm text-muted">
        New password
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </label>
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">{PASSWORD_HELPER}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Reset password
      </h1>
      <p className="mt-3 text-muted">Choose a new password for your account.</p>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-sm text-muted">
        <Link href="/auth/forgot-password" className="text-ink underline">
          Request a new link
        </Link>
      </p>
    </main>
  );
}
