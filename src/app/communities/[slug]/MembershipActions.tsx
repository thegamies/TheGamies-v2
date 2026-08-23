"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { leaveCommunityAction } from "../actions";

type Props = {
  slug: string;
  canLeave: boolean;
  /** Hosts leave from Settings, not Overview. */
  isHost?: boolean;
  /** Public communities can be rejoined from the community page. */
  isPublic?: boolean;
};

export function MembershipActions({
  slug,
  canLeave,
  isHost = false,
  isPublic = false,
}: Props) {
  const [leaveState, leaveFormAction, leavePending] = useActionState(
    leaveCommunityAction,
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const error = leaveState?.error ?? null;
  const showLeave = canLeave && !isHost;

  if (!showLeave && !error) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {showLeave ? (
        <>
          <Button
            type="button"
            variant="bordered"
            disabled={leavePending}
            onClick={() => setConfirmOpen(true)}
          >
            Leave community
          </Button>
          <Dialog
            open={confirmOpen}
            title="Leave community?"
            onClose={() => setConfirmOpen(false)}
            className="w-full max-w-md"
          >
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {isPublic
                ? "You will leave this community. You can join again from this page anytime."
                : "You will leave this community. You can join again later with an invite."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <form action={leaveFormAction}>
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit" variant="bordered" disabled={leavePending}>
                  {leavePending ? "Leaving…" : "Leave community"}
                </Button>
              </form>
              <Button
                type="button"
                variant="bordered"
                disabled={leavePending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </Dialog>
        </>
      ) : null}
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
