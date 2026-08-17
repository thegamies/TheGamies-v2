"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { DeleteEditionForm } from "@/app/communities/[slug]/settings/DeleteEditionForm";
import { EditionScheduleFields } from "@/app/communities/[slug]/settings/EditionScheduleFields";
import { EditionCategoriesDraft } from "@/components/communities/EditionCategoriesDraft";
import { EditionRankModeFields } from "@/components/communities/EditionRankModeFields";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import { saveEditionSettingsAction } from "@/app/communities/actions";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
import {
  editionScheduleDateBounds,
  editionScheduleFieldNotice,
  editionStatusLabel,
  formatEditionDateTimeInput,
  type EditionStatus,
} from "@/lib/communities/edition-status";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

function fieldFromIso(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatEditionDateTimeInput(parsed);
}

function settingsDraftKey(input: {
  opens: string;
  closes: string;
  publishes: string;
  categoryIds: string[];
  rankMode: SharedRankMode;
}): string {
  return JSON.stringify({
    opens: input.opens,
    closes: input.closes,
    publishes: input.publishes,
    categoryIds: input.categoryIds,
    rankMode: input.rankMode,
  });
}

function editionSettingsSyncKey(input: {
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
  rankMode: SharedRankMode;
  categoryOptions: EditionAwardCategoryOption[];
}): string {
  return settingsDraftKey({
    opens: fieldFromIso(input.opensAt),
    closes: fieldFromIso(input.closesAt),
    publishes: fieldFromIso(input.publishesAt),
    categoryIds: input.categoryOptions.map((c) => c.id),
    rankMode: input.rankMode,
  });
}

/** Edition settings: schedule, categories, and tie numbering — one Save. */
export function EditionYearSettings({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
  rankMode,
  categoryOptions = [],
  siteCategoryCatalog = [],
  showHeading = true,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
  rankMode: SharedRankMode;
  categoryOptions?: EditionAwardCategoryOption[];
  /** Full active site award catalog for the Add category sheet. */
  siteCategoryCatalog?: AwardCategoryOption[];
  showHeading?: boolean;
}) {
  const syncKey = editionSettingsSyncKey({
    opensAt,
    closesAt,
    publishesAt,
    rankMode,
    categoryOptions,
  });

  return (
    <EditionYearSettingsForm
      key={syncKey}
      slug={slug}
      year={year}
      status={status}
      opensAt={opensAt}
      closesAt={closesAt}
      publishesAt={publishesAt}
      rankMode={rankMode}
      categoryOptions={categoryOptions}
      siteCategoryCatalog={siteCategoryCatalog}
      showHeading={showHeading}
    />
  );
}

function EditionYearSettingsForm({
  slug,
  year,
  status,
  opensAt,
  closesAt,
  publishesAt,
  rankMode,
  categoryOptions,
  siteCategoryCatalog,
  showHeading,
}: {
  slug: string;
  year: number;
  status: EditionStatus;
  opensAt: string | null;
  closesAt: string | null;
  publishesAt: string | null;
  rankMode: SharedRankMode;
  categoryOptions: EditionAwardCategoryOption[];
  siteCategoryCatalog: AwardCategoryOption[];
  showHeading: boolean;
}) {
  const categoriesLocked = status === "closed" || status === "published";
  const [state, formAction, pending] = useActionState(
    saveEditionSettingsAction,
    null,
  );
  const [opens, setOpens] = useState(() => fieldFromIso(opensAt));
  const [closes, setCloses] = useState(() => fieldFromIso(closesAt));
  const [publishes, setPublishes] = useState(() => fieldFromIso(publishesAt));
  const [selected, setSelected] = useState(categoryOptions);
  const [draftRankMode, setDraftRankMode] = useState(rankMode);
  const [clientError, setClientError] = useState<string | null>(null);
  const submittedKeyRef = useRef<string | null>(null);

  const [savedKey, setSavedKey] = useState(() =>
    settingsDraftKey({
      opens: fieldFromIso(opensAt),
      closes: fieldFromIso(closesAt),
      publishes: fieldFromIso(publishesAt),
      categoryIds: categoryOptions.map((c) => c.id),
      rankMode,
    }),
  );

  const currentKey = settingsDraftKey({
    opens,
    closes,
    publishes,
    categoryIds: selected.map((c) => c.id),
    rankMode: draftRankMode,
  });
  const dirty = currentKey !== savedKey;

  const { dialog: unsavedDialog } = useUnsavedChangesGuard(dirty, {
    message:
      "Leave without saving? Your latest edition settings won’t be kept.",
  });

  useEffect(() => {
    if (!state) return;
    if ("ok" in state && state.ok && submittedKeyRef.current) {
      setSavedKey(submittedKeyRef.current);
      setClientError(null);
    }
    submittedKeyRef.current = null;
  }, [state]);

  const bounds = useMemo(
    () => editionScheduleDateBounds({ opens, closes, publishes }),
    [opens, closes, publishes],
  );

  const scheduleNotice = useMemo(
    () =>
      editionScheduleFieldNotice({
        opens,
        closes,
        publishes,
        previousStatus: status,
      }),
    [opens, closes, publishes, status],
  );

  const error =
    clientError ?? (state && "error" in state ? state.error : null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (
      !opens.trim() ||
      !closes.trim() ||
      !publishes.trim() ||
      scheduleNotice?.tone === "error"
    ) {
      event.preventDefault();
      return;
    }
    submittedKeyRef.current = currentKey;
  }

  const saveBarMessage = error ? (
    <span className="text-accent">{error}</span>
  ) : (
    "Unsaved changes"
  );

  return (
    <div className={dirty ? "pb-24" : undefined}>
      <div
        className={showHeading ? "mt-8 border-t border-line pt-6" : "mt-6"}
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
        <p className="mt-2 max-w-xl text-sm text-muted">
          Schedule, categories, and tie numbering save together.
        </p>
      </div>

      <form
        action={formAction}
        noValidate
        onSubmit={onSubmit}
        className="mt-4 max-w-xl space-y-8"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="year" value={year} />
        {selected.map((c) => (
          <input key={c.id} type="hidden" name="categoryIds" value={c.id} />
        ))}

        <section className="space-y-3">
          <h4 className="font-display text-xl tracking-wide text-ink">
            Schedule
          </h4>
          <p className="text-sm text-muted">
            Set when voting opens, when it closes, and when results go live.
          </p>
          <EditionScheduleFields
            opens={opens}
            closes={closes}
            publishes={publishes}
            bounds={bounds}
            disabled={pending}
            idPrefix="edition-settings"
            year={year}
            notice={scheduleNotice}
            onOpens={setOpens}
            onCloses={setCloses}
            onPublishes={setPublishes}
          />
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h4 className="font-display text-xl tracking-wide text-ink">
            Categories
          </h4>
          <p className="text-sm text-muted">
            {categoriesLocked
              ? "Category awards for this event are locked after voting closes."
              : "Add site awards to this event’s ballot. Changes apply when you save."}
          </p>
          <EditionCategoriesDraft
            catalog={siteCategoryCatalog}
            selected={selected}
            disabled={pending}
            locked={categoriesLocked}
            onChange={setSelected}
          />
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h4 className="font-display text-xl tracking-wide text-ink">
            Tie numbering
          </h4>
          <p className="text-sm text-muted">
            How this event numbers ties on the public boards. Changing this does
            not rescore ballots.
          </p>
          <EditionRankModeFields
            value={draftRankMode}
            disabled={pending}
            onChange={setDraftRankMode}
          />
        </section>

        {dirty ? (
          <PinnedSaveBar message={saveBarMessage}>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </PinnedSaveBar>
        ) : null}
      </form>

      <DeleteEditionForm slug={slug} year={year} />
      {unsavedDialog}
    </div>
  );
}
