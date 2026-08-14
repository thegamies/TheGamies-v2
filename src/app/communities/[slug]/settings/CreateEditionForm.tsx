"use client";

import { useActionState, useCallback, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { YearPicker } from "@/components/ui/YearPicker";
import { createCommunityEditionAction } from "../../actions";
import { EditionScheduleFields } from "./EditionScheduleFields";
import {
  computeEditionStatus,
  editionScheduleDateBounds,
  editionScheduleSaveWarning,
  parseEditionScheduleInput,
  validateEditionSchedule,
} from "@/lib/communities/edition-status";
import { nextAvailableYear } from "@/lib/ui/calendar-year";

export function CreateEditionForm({
  slug,
  defaultYear,
  existingYears,
}: {
  slug: string;
  defaultYear: number;
  existingYears: number[];
}) {
  const [state, formAction, pending] = useActionState(
    createCommunityEditionAction,
    null,
  );
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() =>
    nextAvailableYear(defaultYear, existingYears),
  );
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [publishes, setPublishes] = useState("");
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

  const error = clientError ?? (statusWarning ? null : state?.error);

  const resetFields = useCallback(() => {
    setYear(nextAvailableYear(defaultYear, existingYears));
    setOpens("");
    setCloses("");
    setPublishes("");
    setClientError(null);
    setStatusWarning(null);
  }, [defaultYear, existingYears]);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    resetFields();
  }

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
      setClientError(
        "Set when voting opens, when it closes, and when results go live.",
      );
      return;
    }
    const orderError = validateEditionSchedule(
      parsedOpens.date,
      parsedCloses.date,
      parsedPublishes.date,
    );
    if (orderError) {
      event.preventDefault();
      setStatusWarning(null);
      setClientError(orderError);
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
    const warning = editionScheduleSaveWarning("draft", nextStatus);
    if (warning && statusWarning !== warning) {
      event.preventDefault();
      setClientError(null);
      setStatusWarning(warning);
    }
  }

  return (
    <div className="mt-6">
      <Button
        type="button"
        variant="bordered"
        onClick={() => {
          resetFields();
          setOpen(true);
        }}
      >
        Create event
      </Button>

      <Dialog open={open} title="Create event" onClose={closeDialog}>
        <p className="mt-2 text-sm text-muted">
          Pick the year and set when voting opens, when it closes, and when
          results go live.
        </p>
        <form
          action={formAction}
          noValidate
          onSubmit={onSubmit}
          className="mt-4 space-y-3"
        >
          <input type="hidden" name="slug" value={slug} />
          <div>
            <label htmlFor="create-event-year" className="block text-sm text-muted">
              Year
            </label>
            <YearPicker
              id="create-event-year"
              name="year"
              value={year}
              disabledYears={existingYears}
              required
              disabled={pending}
              className="mt-1"
              aria-label="Year"
              onChange={(next) => {
                clearSaveNotices();
                setYear(next);
              }}
            />
          </div>
          <EditionScheduleFields
            opens={opens}
            closes={closes}
            publishes={publishes}
            bounds={bounds}
            disabled={pending}
          idPrefix="create"
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
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="bordered"
              disabled={pending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" variant="bordered" disabled={pending}>
              {pending
                ? "Creating…"
                : statusWarning
                  ? "Create anyway"
                  : "Create event"}
            </Button>
          </div>
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
      </Dialog>
    </div>
  );
}
