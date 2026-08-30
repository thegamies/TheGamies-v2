"use client";

import { useActionState } from "react";
import { joinCommunityAction } from "@/app/communities/actions";
import { Button } from "@/components/ui/Button";

export function CommunityJoinForm({
  code,
  communityName,
}: {
  code: string;
  communityName: string;
}) {
  const [state, formAction, pending] = useActionState(
    joinCommunityAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : `Join ${communityName}`}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
