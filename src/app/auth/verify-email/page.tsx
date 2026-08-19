"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  VERIFY_EMAIL_HEADING,
  VERIFY_EMAIL_INTRO,
} from "@/lib/auth/email-verification-copy";
import { buildSignInHref } from "@/lib/auth/return-to";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { VerifyEmailForm } from "./VerifyEmailForm";

function VerifyEmailBody() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() ?? "";
  const otp = searchParams.get("otp");
  const next = searchParams.get("next");
  const intent = parseListAuthIntent(searchParams.get("intent"));

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Account</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">
        {VERIFY_EMAIL_HEADING}
      </h1>
      <p className="mt-3 text-muted">{VERIFY_EMAIL_INTRO}</p>
      <VerifyEmailForm
        email={email}
        otp={otp}
        next={next}
        intent={intent}
        allowEmailEdit={!email}
        sendCodeOnMount={Boolean(email && !otp)}
      />
      <p className="mt-6 text-sm text-muted">
        Already confirmed?{" "}
        <Link
          href={buildSignInHref({ next, intent })}
          className="text-ink underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-[var(--gutter)] py-12">
      <Suspense fallback={null}>
        <VerifyEmailBody />
      </Suspense>
    </main>
  );
}
