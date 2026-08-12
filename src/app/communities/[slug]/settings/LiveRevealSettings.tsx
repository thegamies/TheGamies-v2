"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { setCommunityLiveScoresVisibleFromAction } from "../../actions";
import {
  formatScoresVisibleDateInput,
  isCommunityLiveScoresRevealed,
} from "@/lib/communities/live-reveal";

function statusCopy(scoresVisibleFrom: Date | null): string {
  if (isCommunityLiveScoresRevealed(scoresVisibleFrom)) {
    if (!scoresVisibleFrom) return "Scores visible.";
    return `Scores visible since ${formatScoresVisibleDateInput(scoresVisibleFrom)}.`;
  }
  if (!scoresVisibleFrom) {
    return "Scores hidden until you set a date.";
  }
  return `Scores open on ${formatScoresVisibleDateInput(scoresVisibleFrom)}.`;
}

export function LiveRevealSettings({
  slug,
  scoresVisibleFrom,
}: {
  slug: string;
  /** ISO timestamp or null from the server. */
  scoresVisibleFrom: string | null;
}) {
  const parsed = scoresVisibleFrom ? new Date(scoresVisibleFrom) : null;
  const from =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const [state, formAction, pending] = useActionState(
    setCommunityLiveScoresVisibleFromAction,
    null,
  );
  const dateValue = formatScoresVisibleDateInput(from);

  return (
    <div className="mt-10 max-w-xl">
      <h3 className="font-display text-2xl tracking-wide text-ink">Scores</h3>
      <p className="mt-2 text-sm text-muted">
        Rank order stays public. Detailed scores stay hidden until the date you
        set — for every year on the live board.
      </p>
      <p className="mt-3 text-sm text-ink">{statusCopy(from)}</p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <label className="block text-sm text-muted">
          Show scores from
          <input
            type="date"
            name="date"
            defaultValue={dateValue}
            className={`${fieldInputClass} mt-1`}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="mode"
            value="date"
            variant="bordered"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save date"}
          </Button>
          <Button
            type="submit"
            name="mode"
            value="now"
            variant="bordered"
            disabled={pending}
          >
            Reveal now
          </Button>
          <Button
            type="submit"
            name="mode"
            value="hide"
            variant="bordered"
            disabled={pending}
          >
            Hide scores
          </Button>
        </div>
        {state?.error ? (
          <p className="text-sm text-accent" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
