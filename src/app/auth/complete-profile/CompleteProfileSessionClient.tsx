"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { claimNeonAuthSession } from "@/lib/auth/claim-oauth-session";
import { GOOGLE_SIGN_IN_FAILED } from "@/lib/auth/google-sign-in-client";
import { NEON_AUTH_SESSION_VERIFIER_PARAM } from "@/lib/auth/neon-auth-session-verifier";
import { buildSignInHref, GOOGLE_COMPLETE_PROFILE_PATH } from "@/lib/auth/return-to";

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
    ).then((result) => {
      if ("ok" in result) {
        const params = new URLSearchParams();
        if (next && next !== "/account") params.set("next", next);
        const qs = params.toString();
        window.location.assign(
          qs ? `${GOOGLE_COMPLETE_PROFILE_PATH}?${qs}` : GOOGLE_COMPLETE_PROFILE_PATH,
        );
        return;
      }
      setError(result.error);
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
