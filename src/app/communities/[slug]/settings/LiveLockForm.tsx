"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { setLiveRankingsLockedAction } from "../../actions";

export function LiveLockForm({
  slug,
  locked,
  liveEnabled,
}: {
  slug: string;
  locked: boolean;
  liveEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setLiveRankingsLockedAction,
    null,
  );

  return (
    <form action={formAction} className="mt-10 max-w-xl space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locked" value={locked ? "false" : "true"} />
      <h3 className="font-display text-2xl tracking-wide text-ink">Lock</h3>
      <p className="text-sm text-ink">
        {locked
          ? "Live rankings are locked. The public board stays frozen until you unlock it."
          : "Lock freezes the public board as it is now. Member list changes will not move standings until you unlock."}
      </p>
      {!liveEnabled ? (
        <p className="text-sm text-muted">
          Turn live rankings on before locking.
        </p>
      ) : null}
      <Button
        type="submit"
        variant="bordered"
        disabled={pending || (!liveEnabled && !locked)}
      >
        {pending
          ? "Saving…"
          : locked
            ? "Unlock live rankings"
            : "Lock live rankings"}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
