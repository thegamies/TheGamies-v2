"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/Radio";
import { setCommunityEditionRankModeAction } from "../../actions";
import type { SharedRankMode } from "@/lib/standings/shared-rank";

const OPTIONS: Array<{
  id: SharedRankMode;
  label: string;
  hint: string;
}> = [
  {
    id: "competition",
    label: "Competition",
    hint: "Tied games share a place. The next place skips (1 · 1 · 3).",
  },
  {
    id: "dense",
    label: "Dense",
    hint: "Tied games share a place. The next place is the next number (1 · 1 · 2).",
  },
];

export function EditionRankModeForm({
  slug,
  year,
  rankMode,
}: {
  slug: string;
  year: number;
  rankMode: SharedRankMode;
}) {
  const [state, formAction, pending] = useActionState(
    setCommunityEditionRankModeAction,
    null,
  );

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="font-display text-2xl tracking-wide text-ink">
        Tie numbering
      </h3>
      <p className="mt-2 max-w-xl text-sm text-muted">
        How this event numbers ties on the public boards. Changing this does
        not rescore ballots.
      </p>

      <form action={formAction} className="mt-4 max-w-xl space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="year" value={year} />
        <fieldset className="space-y-3">
          <legend className="sr-only">Tie numbering</legend>
          {OPTIONS.map((opt) => (
            <RadioOption
              key={opt.id}
              name="rankMode"
              value={opt.id}
              defaultChecked={rankMode === opt.id}
              hint={opt.hint}
            >
              {opt.label}
            </RadioOption>
          ))}
        </fieldset>
        <Button type="submit" variant="bordered" disabled={pending}>
          {pending ? "Saving…" : "Save numbering"}
        </Button>
      </form>

      {state?.error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
