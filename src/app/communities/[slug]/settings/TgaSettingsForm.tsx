"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { setCommunityTgaOptInAction } from "../the-game-awards/actions";

export function TgaSettingsForm({
  slug,
  year,
  enabled,
}: {
  slug: string;
  year: number | null;
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setCommunityTgaOptInAction,
    null,
  );

  if (year == null) {
    return (
      <p className="mt-6 max-w-xl text-sm text-muted">
        {TGA_PUBLIC_LABEL} is not on for the site yet.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <p className="text-sm text-ink">
        {year} {TGA_PUBLIC_LABEL} is {enabled ? "on" : "off"} for this
        community. Members use their own sheet. Winners come from the site
        show.
      </p>
      <Button type="submit" variant="bordered" disabled={pending}>
        {pending ? "Saving…" : enabled ? "Turn off" : `Run ${TGA_PUBLIC_LABEL}`}
      </Button>
      {state?.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
