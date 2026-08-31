"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { ContinueWithGoogle } from "@/components/auth/ContinueWithGoogle";
import { Button } from "@/components/ui/Button";
import {
  googleOAuthReturnMessage,
} from "@/lib/auth/google-sign-in-client";
import { PASSWORD_RESET_UPDATED } from "@/lib/auth/password";
import { rememberPostAuthNext } from "@/lib/auth/post-auth-next";
import { buildSignUpHref } from "@/lib/auth/return-to";
import { signInOnThisOrigin } from "@/lib/auth/sign-in-client";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const intent = parseListAuthIntent(searchParams.get("intent"));
  const [error, setError] = useState<string | null>(
    googleOAuthReturnMessage(searchParams.get("error")),
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    rememberPostAuthNext(next || null);
  }, [next]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    try {
      const result = await signInOnThisOrigin({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        next,
        intent,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.href);
    } catch {
      setError("Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      <p className="text-sm">
        <Link href="/auth/forgot-password" className="text-ink underline">
          Forgot password?
        </Link>
      </p>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function ResetNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reset") !== "1") return null;
  return (
    <p className="mt-4 text-sm text-muted" role="status">
      {PASSWORD_RESET_UPDATED}
    </p>
  );
}

function CreateAccountLink() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const intent = parseListAuthIntent(searchParams.get("intent"));
  return (
    <Link
      href={buildSignUpHref({ next, intent })}
      className="text-ink underline"
    >
      Create an account
    </Link>
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
        <ResetNotice />
      </Suspense>

      <div className="mt-10 space-y-4">
        <ContinueWithGoogle />
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Suspense
          fallback={
            <Link href="/auth/sign-up" className="text-ink underline">
              Create an account
            </Link>
          }
        >
          <CreateAccountLink />
        </Suspense>
      </p>
    </main>
  );
}
