"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { claimListAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "tg_dismiss_list_save_prompt";

function subscribeDismiss(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getDismissedSnapshot() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerDismissedSnapshot() {
  return true;
}

type SoftSavePromptProps = {
  publicId: string;
  canClaim: boolean;
  isSignedIn: boolean;
  alreadyOwned: boolean;
};

export function SoftSavePrompt({
  publicId,
  canClaim,
  isSignedIn,
  alreadyOwned,
}: SoftSavePromptProps) {
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    getDismissedSnapshot,
    getServerDismissedSnapshot,
  );

  const visible = canClaim && !alreadyOwned && !dismissed;
  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
      window.dispatchEvent(new Event("storage"));
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-8 border border-line bg-panel p-5">
      <p className="font-display text-2xl tracking-wide text-ink">
        Save this list to your account
      </p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Sign in to keep editing from any device and show it on your profile.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {isSignedIn ? (
          <form action={claimListAction}>
            <input type="hidden" name="publicId" value={publicId} />
            <Button type="submit">Save to account</Button>
          </form>
        ) : (
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(`/l/${publicId}`)}`}
          >
            <Button type="button">Sign in to save</Button>
          </Link>
        )}
        <Button type="button" variant="quiet" onClick={dismiss}>
          Don&apos;t prompt again
        </Button>
      </div>
    </div>
  );
}
