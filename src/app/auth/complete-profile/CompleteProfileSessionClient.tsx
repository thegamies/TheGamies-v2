"use client";

import Link from "@/lib/next-link";
import { useEffect, useRef, useState } from "react";
import { claimNeonAuthSession } from "@/lib/auth/claim-oauth-session";
import { GOOGLE_SIGN_IN_FAILED } from "@/lib/auth/google-sign-in-client";
import { NEON_AUTH_SESSION_VERIFIER_PARAM } from "@/lib/auth/neon-auth-session-verifier";
import { clearPostAuthNext } from "@/lib/auth/post-auth-next";
import { buildSignInHref } from "@/lib/auth/return-to";
import { resumeAfterGoogleSignIn } from "./resume-after-google";

export function CompleteProfileSessionClient({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void claimNeonAuthSession(
      new URLSearchParams(window.location.search).get(
        NEON_AUTH_SESSION_VERIFIER_PARAM,
      ) ?? "",
    ).then(async (result) => {
      if (!("ok" in result)) {
        setError(result.error);
        return;
      }
      const resume = await resumeAfterGoogleSignIn(next);
      clearPostAuthNext();
      window.location.replace(resume.href);
    });
  }, [next]);

  if (!error) {
    return (
      <p className="mt-10 text-sm text-muted">Continuing with Google…</p>
    );
  }

  return (
    <>
      <p className="mt-10 text-sm text-accent">{error || GOOGLE_SIGN_IN_FAILED}</p>
      <p className="mt-6">
        <Link href={buildSignInHref({ next })} className="text-ink underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
