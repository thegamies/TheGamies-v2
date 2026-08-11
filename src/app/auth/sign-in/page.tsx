"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { signInWithEmail } from "./actions";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInWithEmail, null);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Sign in
      </h1>
      <p className="mt-3 text-muted">Welcome back to The Gamies.</p>

      <form action={formAction} className="mt-10 space-y-4">
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
            autoComplete="current-password"
            className={fieldClass}
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-accent">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/auth/sign-up" className="text-ink underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
