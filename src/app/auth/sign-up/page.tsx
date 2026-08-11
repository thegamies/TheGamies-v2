"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { signUpWithEmail } from "./actions";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, null);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Join The Gamies
      </h1>
      <p className="mt-3 text-muted">
        Create an account to save lists and appear on the boards.
      </p>

      <form action={formAction} className="mt-10 space-y-4">
        <label className="block text-sm text-muted">
          Display name
          <input
            name="displayName"
            type="text"
            required
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm text-muted">
          Username
          <input
            name="username"
            type="text"
            required
            autoComplete="username"
            pattern="[A-Za-z0-9_]{3,24}"
            className={fieldClass}
          />
        </label>
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
        <label className="block text-sm text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClass}
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-accent">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-ink underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
