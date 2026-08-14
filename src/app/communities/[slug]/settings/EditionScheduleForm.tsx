"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EditionScheduleFields } from "./EditionScheduleFields";
import { setCommunityEditionScheduleAction } from "../../actions";
import {
  computeEditionStatus,
  editionScheduleDateBounds,
  editionScheduleSaveWarning,
  editionStatusLabel,
  formatEditionDateTimeInput,
  parseEditionScheduleInput,
  validateEditionSchedule,
  type EditionStatus,
} from "@/lib/communities/edition-status";

function fieldFromIso(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatEditionDateTimeInput(parsed);
}

export function EditionScheduleForm({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
  showHeading = true,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
  showHeading?: boolean;
}) {
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    setCommunityEditionScheduleAction,
    null,
  );
  const [opens, setOpens] = useState(() => fieldFromIso(opensAt));
  const [closes, setCloses] = useState(() => fieldFromIso(closesAt));
  const [publishes, setPublishes] = useState(() => fieldFromIso(publishesAt));
  const [clientError, setClientError] = useState<string | null>(null);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);

  const bounds = useMemo(
    () =>
      editionScheduleDateBounds({
        opens,
        closes,
        publishes,
      }),
    [opens, closes, publishes],
  );

  const pending = schedulePending;
  const error = clientError ?? (statusWarning ? null : scheduleState?.error);

  function clearSaveNotices() {
    setClientError(null);
    setStatusWarning(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const parsedOpens = parseEditionScheduleInput(opens);
    const parsedCloses = parseEditionScheduleInput(closes);
    const parsedPublishes = parseEditionScheduleInput(publishes);
    if (
      "error" in parsedOpens ||
      "error" in parsedCloses ||
      "error" in parsedPublishes
    ) {
      event.preventDefault();
      setStatusWarning(null);
      setClientError("Set when voting opens, when it closes, and when results go live.");
      return;
    }

    const invalid = validateEditionSchedule(
      parsedOpens.date,
      parsedCloses.date,
      parsedPublishes.date,
    );
    if (invalid) {
      event.preventDefault();
      setStatusWarning(null);
      setClientError(invalid);
      return;
    }

    const nextStatus = computeEditionStatus(
      {
        opensAt: parsedOpens.date,
        closesAt: parsedCloses.date,
        publishesAt: parsedPublishes.date,
      },
      new Date(),
    );
    const warning = editionScheduleSaveWarning(status, nextStatus);
    if (warning && statusWarning !== warning) {
      event.preventDefault();
      setClientError(null);
      setStatusWarning(warning);
    }
  }

  return (
    <div
      className={
        showHeading ? "mt-8 border-t border-line pt-6" : "mt-6"
      }
    >
      {showHeading ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-2xl tracking-wide text-ink">
            {year} event
          </h3>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <p className="text-muted">{editionStatusLabel(status)}</p>
            <Link
              href={`/communities/${encodeURIComponent(slug)}/edition/${year}`}
              className="text-ink underline-offset-4 hover:underline"
            >
              View event
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">{editionStatusLabel(status)}</p>
      )}
      <p className="mt-2 text-sm text-muted">
        Set when voting opens, when it closes, and when results go live.
      </p>

      <form
        action={scheduleAction}
        noValidate
        onSubmit={onSubmit}
        className="mt-4 max-w-xl space-y-3"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="year" value={year} />
        <EditionScheduleFields
          opens={opens}
          closes={closes}
          publishes={publishes}
          bounds={bounds}
          disabled={pending}
          idPrefix="schedule"
          year={year}
          onOpens={(next) => {
            clearSaveNotices();
            setOpens(next);
          }}
          onCloses={(next) => {
            clearSaveNotices();
            setCloses(next);
          }}
          onPublishes={(next) => {
            clearSaveNotices();
            setPublishes(next);
          }}
        />
        <Button type="submit" variant="bordered" disabled={pending}>
          {schedulePending
            ? "Saving…"
            : statusWarning
              ? "Save anyway"
              : "Save schedule"}
        </Button>
        {statusWarning ? (
          <p className="text-sm text-accent" role="status">
            {statusWarning}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
