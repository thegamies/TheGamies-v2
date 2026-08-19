"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect } from "react";
import { VerifyEmailForm } from "@/app/auth/verify-email/VerifyEmailForm";
import { Button } from "@/components/ui/Button";
import {
  VERIFY_EMAIL_HEADING,
  VERIFY_EMAIL_INTRO,
} from "@/lib/auth/email-verification-copy";
import { rememberPostAuthNext } from "@/lib/auth/post-auth-next";
import { PASSWORD_HELPER } from "@/lib/auth/password";
import { buildSignInHref } from "@/lib/auth/return-to";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { signUpWithEmail, type SignUpState } from "./actions";

const fieldClass =
  "mt-1 w-full border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent";

function SignUpForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const intent = parseListAuthIntent(searchParams.get("intent"));
  const [state, formAction, pending] = useActionState(
    signUpWithEmail,
    null as SignUpState,
  );

  useEffect(() => {
    rememberPostAuthNext(next || null);
  }, [next]);

  if (state && "needsVerification" in state) {
    return (
      <>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Account
        </p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
          {VERIFY_EMAIL_HEADING}
        </h1>
        <p className="mt-3 text-muted">{VERIFY_EMAIL_INTRO}</p>
        <VerifyEmailForm
          email={state.email}
          next={next || null}
          intent={intent}
          sendCodeOnMount={!state.codeRequested}
        />
      </>
    );
  }

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        Join The Gamies
      </h1>
      <p className="mt-3 text-muted">
        Create an account to save lists and appear on the boards.
      </p>
      <form action={formAction} className="mt-10 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {intent ? <input type="hidden" name="intent" value={intent} /> : null}
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
        <p className="text-xs text-muted">{PASSWORD_HELPER}</p>
        {state?.error ? (
          <p className="text-sm text-accent">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </>
  );
}

function SignInCrossLink() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const intent = parseListAuthIntent(searchParams.get("intent"));
  return (
    <Link
      href={buildSignInHref({ next, intent })}
      className="text-ink underline"
    >
      Sign in
    </Link>
  );
}

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Suspense
          fallback={
            <Link href="/auth/sign-in" className="text-ink underline">
              Sign in
            </Link>
          }
        >
          <SignInCrossLink />
        </Suspense>
      </p>
    </main>
  );
}
