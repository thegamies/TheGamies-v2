"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import { EditionScheduleFields } from "@/app/communities/[slug]/settings/EditionScheduleFields";
import { EditionCategoriesDraft } from "@/components/communities/EditionCategoriesDraft";
import { EditionRankModeFields } from "@/components/communities/EditionRankModeFields";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { YearPicker } from "@/components/ui/YearPicker";
import { createCommunityEditionAction } from "@/app/communities/actions";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
import {
  editionScheduleDateBounds,
  editionScheduleFieldNotice,
} from "@/lib/communities/edition-status";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import { nextAvailableYear } from "@/lib/ui/calendar-year";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

export function CreateEventForm({
  slug,
  defaultYear,
  existingYears,
  siteCategoryCatalog,
}: {
  slug: string;
  defaultYear: number;
  existingYears: number[];
  siteCategoryCatalog: AwardCategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createCommunityEditionAction,
    null,
  );
  const [initialYear] = useState(() =>
    nextAvailableYear(defaultYear, existingYears),
  );
  const [year, setYear] = useState(initialYear);
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [publishes, setPublishes] = useState("");
  const [selected, setSelected] = useState<EditionAwardCategoryOption[]>([]);
  const [rankMode, setRankMode] = useState<SharedRankMode>("dense");
  const [submitted, setSubmitted] = useState(false);

  const dirty =
    year !== initialYear ||
    opens !== "" ||
    closes !== "" ||
    publishes !== "" ||
    selected.length > 0 ||
    rankMode !== "dense";

  const { allowLeave, dialog: unsavedDialog } = useUnsavedChangesGuard(
    dirty && !pending,
    {
      message:
        "Leave without creating this event? Your draft won’t be kept.",
    },
  );

  const bounds = useMemo(
    () => editionScheduleDateBounds({ opens, closes, publishes }),
    [opens, closes, publishes],
  );

  const scheduleNotice = useMemo(() => {
    const live = editionScheduleFieldNotice({
      opens,
      closes,
      publishes,
      previousStatus: "draft",
    });
    if (live) return live;
    if (
      submitted &&
      (!opens.trim() || !closes.trim() || !publishes.trim())
    ) {
      return {
        field: "opens" as const,
        tone: "error" as const,
        message:
          "Set when voting opens, when it closes, and when results go live.",
      };
    }
    return null;
  }, [opens, closes, publishes, submitted]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setSubmitted(true);
    if (
      !opens.trim() ||
      !closes.trim() ||
      !publishes.trim() ||
      scheduleNotice?.tone === "error"
    ) {
      event.preventDefault();
      return;
    }
    allowLeave();
  }

  return (
    <>
      <form
        action={formAction}
        noValidate
        onSubmit={onSubmit}
        className="mt-6 max-w-xl space-y-8"
      >
        <input type="hidden" name="slug" value={slug} />
        {selected.map((c) => (
          <input key={c.id} type="hidden" name="categoryIds" value={c.id} />
        ))}

        <section className="space-y-3">
          <div>
            <label
              htmlFor="create-event-year"
              className="block text-sm text-muted"
            >
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
              onChange={setYear}
            />
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h3 className="font-display text-xl tracking-wide text-ink">
            Schedule
          </h3>
          <p className="text-sm text-muted">
            Set when voting opens, when it closes, and when results go live.
          </p>
          <EditionScheduleFields
            opens={opens}
            closes={closes}
            publishes={publishes}
            bounds={bounds}
            disabled={pending}
            idPrefix="create"
            year={year}
            notice={scheduleNotice}
            onOpens={setOpens}
            onCloses={setCloses}
            onPublishes={setPublishes}
          />
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h3 className="font-display text-xl tracking-wide text-ink">
            Categories
          </h3>
          <p className="text-sm text-muted">
            Add site awards to this event’s ballot. You can change them later.
          </p>
          <EditionCategoriesDraft
            catalog={siteCategoryCatalog}
            selected={selected}
            disabled={pending}
            locked={false}
            onChange={setSelected}
          />
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h3 className="font-display text-xl tracking-wide text-ink">
            Tie numbering
          </h3>
          <p className="text-sm text-muted">
            How this event numbers ties on the public boards. Dense is the
            default; you can change it later.
          </p>
          <EditionRankModeFields
            value={rankMode}
            disabled={pending}
            onChange={setRankMode}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button type="submit" variant="bordered" disabled={pending}>
            {pending ? "Creating…" : "Create event"}
          </Button>
          {state?.error ? (
            <p className="text-sm text-accent" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
      {unsavedDialog}
    </>
  );
}
