"use client";

import { useState, useTransition } from "react";
import { RadioOption } from "@/components/ui/Radio";
import { setCloudflareCronPausedAction } from "./actions";

type Props = {
  initialPaused: boolean;
  unavailable: string | null;
};

export function AdminScheduledClient({ initialPaused, unavailable }: Props) {
  const [paused, setPaused] = useState(initialPaused);
  const [error, setError] = useState<string | null>(unavailable);
  const [pending, startTransition] = useTransition();

  function save(next: boolean) {
    startTransition(async () => {
      const result = await setCloudflareCronPausedAction(next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setPaused(result.paused === true);
    });
  }

  return (
    <div className="max-w-xl">
      <fieldset className="space-y-3" disabled={Boolean(unavailable) || pending}>
        <legend className="font-display text-2xl tracking-wide text-ink">
          Cloudflare jobs
        </legend>
        <p className="text-sm text-muted">
          Pause to skip every Cloudflare minute job, including edition freeze.
          The database is not touched while this is off.
        </p>
        <RadioOption
          name="cron-paused"
          checked={!paused}
          onChange={() => save(false)}
          hint="Edition freeze and any later Cloudflare jobs tick on schedule."
        >
          Run
        </RadioOption>
        <RadioOption
          name="cron-paused"
          checked={paused}
          onChange={() => save(true)}
          hint="Cloudflare scheduled jobs return without work until you run them again."
        >
          Pause
        </RadioOption>
      </fieldset>
      {unavailable ? (
        <p className="mt-4 text-sm text-muted">{unavailable}</p>
      ) : null}
      {error && error !== unavailable ? (
        <p className="mt-4 text-sm text-danger">{error}</p>
      ) : null}
      {pending ? (
        <p className="mt-4 text-sm text-muted">Saving…</p>
      ) : null}
    </div>
  );
}
