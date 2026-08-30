"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { changeSignedInPassword } from "@/lib/auth/change-password-client";
import {
  PASSWORD_HELPER,
  passwordsMatch,
  validatePassword,
} from "@/lib/auth/password";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export function AccountPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!currentPassword) {
      setOk(false);
      setError("Enter your current password.");
      return;
    }
    const newCheck = validatePassword(newPassword);
    if (!newCheck.ok) {
      setOk(false);
      setError(newCheck.message);
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setOk(false);
      setError("Does not match the other password.");
      return;
    }
    if (newPassword === currentPassword) {
      setOk(false);
      setError("New password must be different from your current password.");
      return;
    }

    setPending(true);
    setError(null);
    setOk(false);
    try {
      const result = await changeSignedInPassword({
        currentPassword,
        newPassword,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOk(true);
    } catch {
      setError("Could not update password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-12 max-w-lg border-t border-line pt-8">
      <h2 className="font-display text-2xl tracking-wide text-ink">
        Password
      </h2>
      <p className="mt-2 text-sm text-muted">{PASSWORD_HELPER}</p>
      <form action={onSubmit} className="mt-4 space-y-4">
        <label className="block text-sm text-muted">
          Current password
          <input
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
            className={fieldClass}
          />
        </label>
        <label className="block text-sm text-muted">
          New password
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm text-muted">
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            className={fieldClass}
          />
        </label>
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : ok ? (
          <p className="text-sm text-muted" role="status">
            Password updated.
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}
