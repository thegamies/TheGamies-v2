"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { confirmEmailWithToken } from "@/lib/auth/confirm-email-client";
import { buildSignInHref, resolvePostAuthRedirect } from "@/lib/auth/return-to";

export function ConfirmEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const next = resolvePostAuthRedirect(searchParams.get("next"));
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError("missing");
      return;
    }
    void confirmEmailWithToken(token).then((result) => {
      if ("ok" in result) {
        // Full document load so SiteHeader picks up the new session cookie.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- session cookie must apply on a new document
        window.location.assign(next);
        return;
      }
      setError(result.error);
    });
  }, [token, next]);

  if (!error) {
    return <p className="mt-10 text-sm text-muted">Confirming your email…</p>;
  }

  return (
    <>
      <p className="mt-3 text-muted">Sign in to continue.</p>
      <p className="mt-10">
        <Link href={buildSignInHref({ next })} className="text-ink underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
