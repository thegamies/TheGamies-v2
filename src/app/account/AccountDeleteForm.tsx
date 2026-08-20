"use client";

import { useState, type FormEvent } from "react";
import { ACCOUNT_DELETE_FAILED } from "@/lib/auth/account-delete-copy";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";

export function AccountDeleteForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? ACCOUNT_DELETE_FAILED);
        setPending(false);
        return;
      }
      // Full document load. router.push would still refresh /account after Auth close.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- leave the deleted session with a document navigation
      window.location.assign("/");
    } catch {
      setError(ACCOUNT_DELETE_FAILED);
      setPending(false);
    }
  }

  return (
    <div className="mt-12 max-w-lg border-t border-line pt-8">
      <h2 className="font-display text-2xl tracking-wide text-danger">
        Delete account
      </h2>
      <p className="mt-2 text-sm text-muted">
        This removes your profile, lists, community memberships, and open
        ballots. Published community ceremonies keep an anonymized voter line
        with no name and no profile. This cannot be undone.
      </p>
      <Button
        type="button"
        variant="danger-bordered"
        className="mt-4"
        onClick={() => setOpen(true)}
      >
        Delete account
      </Button>

      <Dialog
        open={open}
        title="Delete account"
        tone="danger"
        onClose={closeDialog}
        className="w-full max-w-md"
      >
        <p className="mt-2 text-sm text-muted">
          Enter your password to permanently delete your account. If you are
          the only host of a community, add another host or delete that
          community first.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm text-muted">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className={fieldInputClass}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="bordered"
              disabled={pending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </div>
  );
}
