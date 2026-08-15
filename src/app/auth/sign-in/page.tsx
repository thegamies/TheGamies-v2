"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { signInWithEmail } from "./actions";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const intent = parseListAuthIntent(searchParams.get("intent"));
  const [state, formAction, pending] = useActionState(signInWithEmail, null);

  return (
    <form action={formAction} className="mt-10 space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {intent ? <input type="hidden" name="intent" value={intent} /> : null}
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
  );
}

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Sign in
      </h1>
      <p className="mt-3 text-muted">Welcome back to The Gamies.</p>

      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/auth/sign-up" className="text-ink underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
