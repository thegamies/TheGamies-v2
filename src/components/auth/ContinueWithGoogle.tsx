"use client";

import { useState } from "react";
import { GoogleIcon } from "@/components/BrandIcons";
import { Button } from "@/components/ui/Button";
import {
  GOOGLE_SIGN_IN_FAILED,
  signInWithGoogle,
} from "@/lib/auth/google-sign-in-client";
import { rememberPostAuthNext } from "@/lib/auth/post-auth-next";
import { parseListAuthIntent } from "@/lib/lists/auth-intent";
import { resolvePostAuthRedirect } from "@/lib/auth/return-to";

type Props = {
  next?: string | null;
  intent?: string | null;
  errorCallbackPath?: string;
};

export function ContinueWithGoogle({
  next,
  intent,
  errorCallbackPath = "/auth/sign-in",
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    rememberPostAuthNext(
      resolvePostAuthRedirect(
        next || params?.get("next"),
        parseListAuthIntent(intent || params?.get("intent")),
      ),
    );
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle({ errorCallbackPath });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if ("href" in result) {
        window.location.assign(result.href);
      }
    } catch {
      setError(GOOGLE_SIGN_IN_FAILED);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="bordered"
        className="w-full gap-2.5"
        disabled={pending}
        onClick={() => void onClick()}
      >
        <GoogleIcon className="size-5 shrink-0" />
        {pending ? "Continuing…" : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted">
        or
      </p>
    </div>
  );
}
