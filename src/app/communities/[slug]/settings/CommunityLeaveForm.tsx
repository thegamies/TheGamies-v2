"use client";

import { useActionState } from "react";
import { leaveCommunityAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";
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

  return (
    <div className="mt-10 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">
        Leave community
      </h3>
      {canLeave ? (
        <form action={formAction} className="mt-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="from" value="settings" />
          <Button type="submit" variant="bordered" disabled={pending}>
            {pending ? "Leaving…" : "Leave community"}
          </Button>
        </form>
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
