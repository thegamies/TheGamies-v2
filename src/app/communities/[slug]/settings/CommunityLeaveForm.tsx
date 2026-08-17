"use client";

import { useActionState, useState } from "react";
import { leaveCommunityAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { LAST_ADMIN_LEAVE_NOTE } from "@/lib/communities/rules";

export function CommunityLeaveForm({
  slug,
  canLeave,
}: {
  slug: string;
  canLeave: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    leaveCommunityAction,
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mt-10 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">
        Leave community
      </h3>
      {canLeave ? (
        <>
          <Button
            type="button"
            variant="bordered"
            className="mt-4"
            disabled={pending}
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
              You will leave this community. You can join again later if it
              stays open.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <form action={formAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="from" value="settings" />
                <Button type="submit" variant="bordered" disabled={pending}>
                  {pending ? "Leaving…" : "Leave community"}
                </Button>
              </form>
              <Button
                type="button"
                variant="bordered"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </Dialog>
        </>
      ) : (
        <p className="mt-2 max-w-xl text-sm text-muted">
          {LAST_ADMIN_LEAVE_NOTE}
        </p>
      )}
      {state?.error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
