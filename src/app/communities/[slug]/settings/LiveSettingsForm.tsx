"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { setLiveRankingsEnabledAction } from "../../actions";

export function LiveSettingsForm({
  slug,
  enabled,
}: {
  slug: string;
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setLiveRankingsEnabledAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <p className="text-sm text-ink">
        Live rankings are {enabled ? "on" : "off"}. When on, the community
        shows a public board from members’ signed-in Game of the Year lists.
      </p>
      <Button type="submit" variant="bordered" disabled={pending}>
        {pending
          ? "Saving…"
          : enabled
            ? "Turn live rankings off"
            : "Turn live rankings on"}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
