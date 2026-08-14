"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { joinCommunityAction, leaveCommunityAction } from "../actions";

type Props = {
  slug: string;
  isMember: boolean;
  canLeave: boolean;
  /** Hosts leave from Settings, not Overview. */
  isHost?: boolean;
};

export function MembershipActions({
  slug,
  isMember,
  canLeave,
  isHost = false,
}: Props) {
  const [joinState, joinFormAction, joinPending] = useActionState(
    joinCommunityAction,
    null,
  );
  const [leaveState, leaveFormAction, leavePending] = useActionState(
    leaveCommunityAction,
    null,
  );

  const error = joinState?.error ?? leaveState?.error ?? null;
  const showLeave = isMember && canLeave && !isHost;

  if (isMember && !showLeave && !error) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {isMember ? (
        showLeave ? (
          <form action={leaveFormAction}>
            <input type="hidden" name="slug" value={slug} />
            <Button
              type="submit"
              variant="bordered"
              disabled={leavePending}
            >
              {leavePending ? "Leaving…" : "Leave community"}
            </Button>
          </form>
        ) : null
      ) : (
        <form action={joinFormAction}>
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" disabled={joinPending}>
            {joinPending ? "Joining…" : "Join community"}
          </Button>
        </form>
      )}
      {error ? (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
