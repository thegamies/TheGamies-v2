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
import { CategoryPickerGrid } from "@/components/lists/CategoryPickerGrid";
import type { AwardCategoryOption } from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import { RadioOption } from "@/components/ui/Radio";
import { saveEditionSettingsAction } from "@/app/communities/actions";
import type { EditionAwardCategoryOption } from "@/lib/communities/edition-categories";
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
import { sortedAwardCategories } from "@/lib/lists/category-filter";
import type { SharedRankMode } from "@/lib/standings/shared-rank";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

const RANK_OPTIONS: Array<{
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
  /** Full active site award catalog for the Add category dialog. */
  siteCategoryCatalog?: AwardCategoryOption[];
  showHeading?: boolean;
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);
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

  const serverKey = useMemo(
    () =>
      settingsDraftKey({
        opens: fieldFromIso(opensAt),
        closes: fieldFromIso(closesAt),
        publishes: fieldFromIso(publishesAt),
        categoryIds: categoryOptions.map((c) => c.id),
        rankMode,
      }),
    // categoryOptions identity is unstable; ids + schedule/rank are the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids joined below
    [
      opensAt,
      closesAt,
      publishesAt,
      rankMode,
      categoryOptions.map((c) => c.id).join("|"),
    ],
  );

  useEffect(() => {
    const nextOpens = fieldFromIso(opensAt);
    const nextCloses = fieldFromIso(closesAt);
    const nextPublishes = fieldFromIso(publishesAt);
    setOpens(nextOpens);
    setCloses(nextCloses);
    setPublishes(nextPublishes);
    setSelected(categoryOptions);
    setDraftRankMode(rankMode);
    setSavedKey(serverKey);
    setClientError(null);
    setStatusWarning(null);
    // Sync only when the server baseline key changes — not on every categoryOptions reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

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
      setStatusWarning(null);
      setClientError(null);
    }
    submittedKeyRef.current = null;
  }, [state]);

  const bounds = useMemo(
    () => editionScheduleDateBounds({ opens, closes, publishes }),
    [opens, closes, publishes],
  );

  const catalog = useMemo(
    () => sortedAwardCategories(siteCategoryCatalog),
    [siteCategoryCatalog],
  );
  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  );
  const unusedCatalog = useMemo(
    () => catalog.filter((c) => !selectedIds.has(c.id)),
    [catalog, selectedIds],
  );

  const error =
    clientError ??
    (statusWarning ? null : state && "error" in state ? state.error : null);

  function clearSaveNotices() {
    setClientError(null);
    setStatusWarning(null);
  }

  function addCategoryFromCatalog(id: string) {
    const hit = catalog.find((c) => c.id === id);
    if (!hit) return;
    clearSaveNotices();
    setSelected((rows) =>
      rows.some((row) => row.id === hit.id)
        ? rows
        : [
            ...rows,
            {
              id: hit.id,
              label: hit.label,
              description: hit.description,
              sortOrder: hit.sortOrder ?? rows.length + 1,
              enabled: true,
            },
          ],
    );
    setPickerOpen(false);
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
      return;
    }

    submittedKeyRef.current = currentKey;
  }

  const saveBarMessage = error ? (
    <span className="text-accent">{error}</span>
  ) : statusWarning ? (
    <span className="text-accent">{statusWarning}</span>
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

          <div>
            <h5 className="text-sm font-semibold tracking-wide text-ink">
              Selected awards
            </h5>
            {selected.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No awards selected yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selected.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm text-ink"
                  >
                    <span>
                      <span className="font-semibold">{c.label}</span>
                      {c.description ? (
                        <span className="mt-0.5 block text-muted">
                          {c.description}
                        </span>
                      ) : null}
                    </span>
                    {categoriesLocked ? null : (
                      <Button
                        type="button"
                        variant="bordered"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          clearSaveNotices();
                          setSelected((rows) =>
                            rows.filter((row) => row.id !== c.id),
                          );
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {categoriesLocked ? null : (
            <div className="pt-2">
              <Button
                type="button"
                variant="bordered"
                size="sm"
                disabled={pending || unusedCatalog.length === 0}
                onClick={() => setPickerOpen(true)}
              >
                Add category
              </Button>
              {unusedCatalog.length === 0 && catalog.length > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Every site award is already on this event.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-line pt-6">
          <h4 className="font-display text-xl tracking-wide text-ink">
            Tie numbering
          </h4>
          <p className="text-sm text-muted">
            How this event numbers ties on the public boards. Changing this does
            not rescore ballots.
          </p>
          <fieldset className="space-y-3">
            <legend className="sr-only">Tie numbering</legend>
            {RANK_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.id}
                name="rankMode"
                value={opt.id}
                checked={draftRankMode === opt.id}
                onChange={() => {
                  clearSaveNotices();
                  setDraftRankMode(opt.id);
                }}
                hint={opt.hint}
              >
                {opt.label}
              </RadioOption>
            ))}
          </fieldset>
        </section>

        {dirty ? (
          <PinnedSaveBar message={saveBarMessage}>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : statusWarning
                  ? "Save anyway"
                  : "Save settings"}
            </Button>
          </PinnedSaveBar>
        ) : null}
      </form>

      <DeleteEditionForm slug={slug} year={year} />
      <Dialog
        open={pickerOpen}
        title="Add a category"
        onClose={() => setPickerOpen(false)}
        className="w-full max-w-3xl"
      >
        <p className="mt-2 text-sm text-muted">
          Choose a site award to put on this event’s ballot.
        </p>
        <CategoryPickerGrid
          unused={unusedCatalog}
          onAdd={addCategoryFromCatalog}
        />
      </Dialog>
      {unsavedDialog}
    </div>
  );
}
