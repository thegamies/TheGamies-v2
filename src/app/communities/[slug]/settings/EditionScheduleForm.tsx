"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import {
  setCommunityEditionScheduleAction,
  setCommunityEditionTimestampNowAction,
} from "../../actions";
import {
  editionStatusLabel,
  formatEditionDateTimeInput,
  type EditionStatus,
} from "@/lib/communities/edition-status";

export function EditionScheduleForm({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
}) {
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    setCommunityEditionScheduleAction,
    null,
  );
  const [nowState, nowAction, nowPending] = useActionState(
    setCommunityEditionTimestampNowAction,
    null,
  );

  const opensValue = opensAt
    ? formatEditionDateTimeInput(new Date(opensAt))
    : "";
  const closesValue = closesAt
    ? formatEditionDateTimeInput(new Date(closesAt))
    : "";
  const publishesValue = publishesAt
    ? formatEditionDateTimeInput(new Date(publishesAt))
    : "";

  const pending = schedulePending || nowPending;
  const error = scheduleState?.error ?? nowState?.error;

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl tracking-wide text-ink">
          {year} edition
        </h3>
        <p className="text-sm text-muted">{editionStatusLabel(status)}</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        Voting opens, voting closes, then results publish — status follows these
        times.
      </p>

      <form action={scheduleAction} className="mt-4 max-w-xl space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="year" value={year} />
        <label className="block text-sm text-muted">
          Opens
          <input
            type="datetime-local"
            name="opensAt"
            required
            defaultValue={opensValue}
            className={`${fieldInputClass} mt-1`}
          />
        </label>
        <label className="block text-sm text-muted">
          Closes
          <input
            type="datetime-local"
            name="closesAt"
            required
            defaultValue={closesValue}
            className={`${fieldInputClass} mt-1`}
          />
        </label>
        <label className="block text-sm text-muted">
          Results publish
          <input
            type="datetime-local"
            name="publishesAt"
            required
            defaultValue={publishesValue}
            className={`${fieldInputClass} mt-1`}
          />
        </label>
        <Button type="submit" variant="bordered" disabled={pending}>
          {schedulePending ? "Saving…" : "Save schedule"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["opensAt", "Open now"],
            ["closesAt", "Close now"],
            ["publishesAt", "Publish now"],
          ] as const
        ).map(([field, label]) => (
          <form key={field} action={nowAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="field" value={field} />
            <Button type="submit" variant="bordered" size="sm" disabled={pending}>
              {nowPending ? "Saving…" : label}
            </Button>
          </form>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
