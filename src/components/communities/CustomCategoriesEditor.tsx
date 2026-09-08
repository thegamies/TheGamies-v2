"use client";

import Image from "next/image";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createCustomCategoryAction,
  createCustomCategoryEntryAction,
  deleteCustomCategoryAction,
  deleteCustomCategoryEntryAction,
  updateCustomCategoryAction,
  updateCustomCategoryEntryAction,
  uploadCustomCategoryImageAction,
} from "@/app/communities/actions";
import { ListDragHandle } from "@/components/lists/ListDragHandle";
import {
  cardTouchLockClassName,
  useDragBodyScrollLock,
  useListCardDragSensors,
} from "@/components/lists/cardChrome";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fieldInputClass } from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";
import { GameSearchField } from "@/components/ui/GameSearchField";
import type {
  CustomCategoryEntryView,
  CustomCategoryView,
  CustomCategoryEligibility,
} from "@/lib/communities/custom-category-types";
import {
  CUSTOM_ANSWER_TYPES,
  CUSTOM_CATEGORY_DESCRIPTION_MAX,
  CUSTOM_CATEGORY_NAME_MAX,
  CUSTOM_ELIGIBILITIES,
  CUSTOM_ENTRY_DESCRIPTION_MAX,
  CUSTOM_ENTRY_TITLE_MAX,
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
} from "@/lib/communities/custom-category-types";
import { AWARD_CATEGORY_ELIGIBILITY_LABEL } from "@/lib/live-aggregate/award-category-defs";
import type { CommunityCustomAnswerType } from "@thegamies/db";

export const CUSTOM_ANSWER_TYPE_LABELS: Record<
  (typeof CUSTOM_ANSWER_TYPES)[number],
  string
> = {
  any_game: "Any Game",
  selected_games: "Selected Games",
  text_game: "Text + Game",
  text_only: "Text Only",
};

const ANSWER_TYPE_LABELS = CUSTOM_ANSWER_TYPE_LABELS;

const ANSWER_TYPE_HINTS: Record<(typeof CUSTOM_ANSWER_TYPES)[number], string> = {
  any_game: "Members pick any eligible game. No fixed entry list.",
  selected_games: "You choose the nominee games members can pick from.",
  text_game: "Each entry is a titled option tied to a game.",
  text_only: "Each entry is a titled option with no required game.",
};

type DraftEntry = {
  localId: string;
  title: string;
  description: string;
  gameId: string;
  gameLabel: string | null;
  gameCoverUrl: string | null;
  supportLinkUrl: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
};

export type CategoryModalMode =
  | { kind: "create" }
  | { kind: "edit"; categoryId: string };

type CreateStep = "setup" | "entries";
type EntryFormMode =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; entry: CustomCategoryEntryView };

function needsEntries(answerType: CommunityCustomAnswerType) {
  return answerType !== "any_game";
}

function needsGame(answerType: CommunityCustomAnswerType) {
  return answerType === "selected_games" || answerType === "text_game";
}

function allowsEntryImage(answerType: CommunityCustomAnswerType) {
  return answerType === "text_game" || answerType === "text_only";
}

function emptyDraft(): DraftEntry {
  return {
    localId: crypto.randomUUID(),
    title: "",
    description: "",
    gameId: "",
    gameLabel: null,
    gameCoverUrl: null,
    supportLinkUrl: "",
    imageFile: null,
    imagePreviewUrl: null,
  };
}

export function DeleteCustomCategoryDialog({
  open,
  category,
  slug,
  year,
  onClose,
  onLocalDelete,
}: {
  open: boolean;
  category: CustomCategoryView | null;
  slug: string;
  year: number;
  onClose: () => void;
  onLocalDelete?: (categoryId: string) => void;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCustomCategoryAction,
    null,
  );

  useEffect(() => {
    if (deleteState && "ok" in deleteState && deleteState.ok) {
      onClose();
    }
  }, [deleteState, onClose]);

  const isLocal = Boolean(category && onLocalDelete);

  return (
    <Dialog
      open={open}
      title="Delete community category"
      tone="danger"
      onClose={() => {
        if (deletePending) return;
        onClose();
      }}
      className="w-full max-w-md"
    >
      {category ? (
        isLocal ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted">
              Remove{" "}
              <span className="font-semibold text-ink">{category.name}</span>{" "}
              and its entries from this event’s ballot? This cannot be undone.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="bordered" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  onLocalDelete?.(category.id);
                  onClose();
                }}
              >
                Delete category
              </Button>
            </div>
          </div>
        ) : (
          <form action={deleteAction} className="mt-2 space-y-3">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="categoryId" value={category.id} />
            <p className="text-sm text-muted">
              Remove{" "}
              <span className="font-semibold text-ink">{category.name}</span>{" "}
              and its entries from this event’s ballot? This cannot be undone.
            </p>
            {deleteState && "error" in deleteState ? (
              <p className="text-sm text-accent">{deleteState.error}</p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="bordered"
                disabled={deletePending}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete category"}
              </Button>
            </div>
          </form>
        )
      ) : null}
    </Dialog>
  );
}

export function CategorySheet({
  open,
  mode,
  category,
  slug,
  year,
  onClose,
  onCancel,
  orderedEntryIds,
  onEntryOrderChange,
  onLocalCreate,
  onLocalUpdate,
}: {
  open: boolean;
  mode: CategoryModalMode | null;
  category: CustomCategoryView | null;
  slug: string;
  year: number;
  onClose: () => void;
  /** When set (create flow), Cancel / Back leave to the previous screen instead of closing. */
  onCancel?: () => void;
  orderedEntryIds?: readonly string[];
  onEntryOrderChange?: (entryIds: string[]) => void;
  /** Persist a new category in memory (Create Event before the edition exists). */
  onLocalCreate?: (category: CustomCategoryView) => void;
  onLocalUpdate?: (category: CustomCategoryView) => void;
}) {
  const isEdit = mode?.kind === "edit";
  const [createStep, setCreateStep] = useState<CreateStep>("setup");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [answerType, setAnswerType] =
    useState<CommunityCustomAnswerType>("selected_games");
  const [eligibility, setEligibility] =
    useState<CustomCategoryEligibility>("current_year");
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [entryForm, setEntryForm] = useState<EntryFormMode>({ kind: "list" });
  const [draftForm, setDraftForm] = useState<DraftEntry>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateCustomCategoryAction,
    null,
  );

  useEffect(() => {
    if (!open || !mode) return;
    setError(null);
    setBusy(false);
    setEntryForm({ kind: "list" });
    setDraftForm(emptyDraft());
    if (mode.kind === "create") {
      setCreateStep("setup");
      setName("");
      setDescription("");
      setAnswerType("selected_games");
      setEligibility("current_year");
      setDrafts([]);
      return;
    }
    setCreateStep("setup");
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode?.kind !== "edit" || !category) return;
    setName(category.name);
    setDescription(category.description);
    setAnswerType(category.answerType);
    setEligibility(parseCustomCategoryEligibility(category.eligibility));
  }, [open, mode, category]);

  const liveAnswerType = isEdit
    ? (category?.answerType ?? "any_game")
    : answerType;
  const showEntries = needsEntries(liveAnswerType);

  function validateSetup() {
    if (!name.trim()) {
      setError("Name is required.");
      return false;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return false;
    }
    setError(null);
    return true;
  }

  function goToEntries() {
    if (!validateSetup()) return;
    setCreateStep("entries");
    setEntryForm({ kind: "list" });
    setDraftForm(emptyDraft());
  }

  function openAddDraft() {
    setDraftForm(emptyDraft());
    setEntryForm({ kind: "add" });
    setError(null);
  }

  function saveDraftEntry() {
    if (!draftForm.title.trim()) {
      setError("Every entry needs a title.");
      return;
    }
    if (needsGame(answerType) && !draftForm.gameId) {
      setError("Every entry needs an associated game.");
      return;
    }
    setDrafts((cur) => [...cur, { ...draftForm, localId: crypto.randomUUID() }]);
    setEntryForm({ kind: "list" });
    setDraftForm(emptyDraft());
    setError(null);
  }

  async function uploadEntryImage(entryId: string, file: File) {
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("year", String(year));
    fd.set("entryId", entryId);
    fd.set("image", file);
    const result = await uploadCustomCategoryImageAction(fd);
    if (result.error) throw new Error(result.error);
  }

  async function createCategory() {
    if (!validateSetup()) return;
    if (showEntries && drafts.length === 0) {
      // Allowed — hosts can finish entries later in Edit.
    }
    for (const draft of drafts) {
      if (!draft.title.trim()) {
        setError("Every entry needs a title.");
        return;
      }
      if (needsGame(answerType) && !draft.gameId) {
        setError("Every entry needs an associated game.");
        return;
      }
    }

    if (onLocalCreate) {
      const localId = `draft:${crypto.randomUUID()}`;
      const entries = drafts.map((draft, index) => ({
        id: `draft-entry:${crypto.randomUUID()}`,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        imageUrl: draft.imagePreviewUrl,
        gameId: draft.gameId || null,
        gameTitle: draft.gameLabel,
        gameSlug: null,
        coverUrl: draft.gameCoverUrl,
        supportLinkUrl: draft.supportLinkUrl.trim() || null,
        supportLinkKind: null,
        sortOrder: index,
        entrySource: "host",
      }));
      onLocalCreate({
        id: localId,
        editionId: "",
        name: name.trim(),
        description: description.trim(),
        imageUrl: null,
        answerType,
        eligibility: customAnswerTypeUsesEligibility(answerType)
          ? eligibility
          : "current_year",
        sortOrder: 0,
        entries,
      });
      onClose();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("year", String(year));
      fd.set("name", name.trim());
      fd.set("description", description.trim());
      fd.set("answerType", answerType);
      if (customAnswerTypeUsesEligibility(answerType)) {
        fd.set("eligibility", eligibility);
      }
      const result = await createCustomCategoryAction(null, fd);
      if (!result || "error" in result) {
        setError(result?.error ?? "Could not create category.");
        return;
      }

      for (const draft of drafts) {
        const entryFd = new FormData();
        entryFd.set("slug", slug);
        entryFd.set("year", String(year));
        entryFd.set("categoryId", result.categoryId);
        entryFd.set("title", draft.title);
        if (draft.description.trim()) {
          entryFd.set("description", draft.description);
        }
        if (draft.gameId) entryFd.set("gameId", draft.gameId);
        if (draft.supportLinkUrl.trim()) {
          entryFd.set("supportLinkUrl", draft.supportLinkUrl);
        }
        const entryResult = await createCustomCategoryEntryAction(
          null,
          entryFd,
        );
        if (!entryResult || "error" in entryResult) {
          setError(entryResult?.error ?? "Could not add entry.");
          return;
        }
        if (
          allowsEntryImage(answerType) &&
          draft.imageFile &&
          entryResult.entryId
        ) {
          await uploadEntryImage(entryResult.entryId, draft.imageFile);
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
    } finally {
      setBusy(false);
    }
  }

  function leaveCreate() {
    if (busy || updatePending) return;
    (onCancel ?? onClose)();
  }

  const title = isEdit ? "Edit community category" : "Add community category";
  const descriptionText =
    isEdit ?
      "Update the award details and manage ballot entries."
    : createStep === "setup"
      ? "Name the award and choose how members answer."
      : "Add the options members will see on the ballot.";

  return (
    <Dialog
      open={open}
      title={title}
      placement="contained"
      className="w-full max-w-2xl"
      description={descriptionText}
      onBack={
        mode?.kind === "create"
          ? () => {
              if (busy || updatePending) return;
              if (createStep === "entries" && entryForm.kind === "list") {
                setCreateStep("setup");
                setError(null);
                return;
              }
              if (createStep === "entries" && entryForm.kind !== "list") {
                setEntryForm({ kind: "list" });
                setDraftForm(emptyDraft());
                setError(null);
                return;
              }
              leaveCreate();
            }
          : undefined
      }
      onClose={() => {
        if (busy || updatePending) return;
        onClose();
      }}
    >
      {mode?.kind === "create" && createStep === "setup" ? (
        <div className="space-y-6">
          <CategoryFields
            name={name}
            description={description}
            answerType={answerType}
            eligibility={eligibility}
            answerTypeEditable
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onAnswerTypeChange={(next) => {
              setAnswerType(next);
              if (!needsEntries(next)) setDrafts([]);
            }}
            onEligibilityChange={setEligibility}
          />
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="bordered" onClick={leaveCreate}>
              Cancel
            </Button>
            {showEntries ? (
              <Button type="button" onClick={goToEntries}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void createCategory()}
              >
                {busy ? "Creating…" : "Create category"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {mode?.kind === "create" && createStep === "entries" ? (
        <div className="space-y-6">
          {entryForm.kind === "list" ? (
            <>
              <DraftEntriesList
                drafts={drafts}
                answerType={answerType}
                onAdd={openAddDraft}
                onRemove={(localId) =>
                  setDrafts((cur) => cur.filter((d) => d.localId !== localId))
                }
              />
              {error ? <p className="text-sm text-accent">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="bordered"
                  disabled={busy}
                  onClick={leaveCreate}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void createCategory()}
                >
                  {busy ? "Creating…" : "Create category"}
                </Button>
              </div>
            </>
          ) : (
            <DraftEntryForm
              year={year}
              answerType={answerType}
              eligibility={eligibility}
              value={draftForm}
              onChange={setDraftForm}
              error={error}
              allowImage={!onLocalCreate}
              onCancel={() => {
                setEntryForm({ kind: "list" });
                setDraftForm(emptyDraft());
                setError(null);
              }}
              onSave={saveDraftEntry}
            />
          )}
        </div>
      ) : null}

      {mode?.kind === "edit" && category ? (
        <EditCategorySheet
          slug={slug}
          year={year}
          category={category}
          name={name}
          description={description}
          eligibility={eligibility}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onEligibilityChange={setEligibility}
          updateAction={updateAction}
          updatePending={updatePending}
          updateState={updateState}
          orderedEntryIds={orderedEntryIds}
          onEntryOrderChange={onEntryOrderChange}
          onLocalUpdate={onLocalUpdate}
          onClose={onClose}
        />
      ) : null}

      {mode?.kind === "edit" && !category ? (
        <p className="text-sm text-muted">Loading category…</p>
      ) : null}
    </Dialog>
  );
}

function CategoryFields({
  name,
  description,
  answerType,
  eligibility,
  answerTypeEditable,
  onNameChange,
  onDescriptionChange,
  onAnswerTypeChange,
  onEligibilityChange,
}: {
  name: string;
  description: string;
  answerType: CommunityCustomAnswerType;
  eligibility: CustomCategoryEligibility;
  answerTypeEditable: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAnswerTypeChange?: (next: CommunityCustomAnswerType) => void;
  onEligibilityChange?: (next: CustomCategoryEligibility) => void;
}) {
  const showEligibility = customAnswerTypeUsesEligibility(answerType);

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-semibold tracking-wide text-ink">Details</h5>
      <label className="block text-sm text-muted">
        Name
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={CUSTOM_CATEGORY_NAME_MAX}
          required
          className={fieldInputClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Short description
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={CUSTOM_CATEGORY_DESCRIPTION_MAX}
          required
          rows={3}
          className={fieldInputClass}
        />
      </label>
      {answerTypeEditable ? (
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">Answer type</legend>
          <div className="space-y-2">
            {CUSTOM_ANSWER_TYPES.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer gap-3 border border-line px-3 py-2 text-sm has-[:checked]:border-ink"
              >
                <input
                  type="radio"
                  name="answerType"
                  value={type}
                  checked={answerType === type}
                  onChange={() => onAnswerTypeChange?.(type)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-ink">
                    {ANSWER_TYPE_LABELS[type]}
                  </span>
                  <span className="mt-0.5 block text-muted">
                    {ANSWER_TYPE_HINTS[type]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">
          Answer type:{" "}
          <span className="font-semibold text-ink">
            {ANSWER_TYPE_LABELS[answerType]}
          </span>
          <span className="mt-0.5 block">{ANSWER_TYPE_HINTS[answerType]}</span>
        </p>
      )}
      {showEligibility ? (
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">Game eligibility</legend>
          <div className="space-y-2">
            {CUSTOM_ELIGIBILITIES.map((mode) => (
              <label
                key={mode}
                className="flex cursor-pointer gap-3 border border-line px-3 py-2 text-sm has-[:checked]:border-ink"
              >
                <input
                  type="radio"
                  name="eligibility"
                  value={mode}
                  checked={eligibility === mode}
                  onChange={() => onEligibilityChange?.(mode)}
                  className="mt-1"
                />
                <span className="font-semibold text-ink">
                  {AWARD_CATEGORY_ELIGIBILITY_LABEL[mode]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}

function DraftEntriesList({
  drafts,
  answerType,
  onAdd,
  onRemove,
}: {
  drafts: DraftEntry[];
  answerType: CommunityCustomAnswerType;
  onAdd: () => void;
  onRemove: (localId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h5 className="text-sm font-semibold tracking-wide text-ink">
            Entries
          </h5>
          <p className="mt-1 text-sm text-muted">
            {ANSWER_TYPE_HINTS[answerType]}
          </p>
        </div>
        <Button type="button" variant="bordered" size="sm" onClick={onAdd}>
          Add entry
        </Button>
      </div>
      {drafts.length === 0 ? (
        <p className="text-sm text-muted">No entries yet.</p>
      ) : (
        <ul className="space-y-0 border-t border-line">
          {drafts.map((draft) => {
            const media = draft.imagePreviewUrl || draft.gameCoverUrl;
            return (
              <li
                key={draft.localId}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  {media ? (
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden border border-line">
                      <Image
                        src={media}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{draft.title}</p>
                    {draft.gameLabel ? (
                      <p className="text-sm text-muted">{draft.gameLabel}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger-bordered"
                  size="sm"
                  onClick={() => onRemove(draft.localId)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DraftEntryForm({
  year,
  answerType,
  eligibility,
  value,
  onChange,
  error,
  onCancel,
  onSave,
  allowImage = true,
}: {
  year: number;
  answerType: CommunityCustomAnswerType;
  eligibility: CustomCategoryEligibility;
  value: DraftEntry;
  onChange: (next: DraftEntry) => void;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
  allowImage?: boolean;
}) {
  const gameRequired = needsGame(answerType);
  const imageAllowed = allowImage && allowsEntryImage(answerType);

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-semibold tracking-wide text-ink">
        Add entry
      </h5>
      <label className="block text-sm text-muted">
        Title
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          maxLength={CUSTOM_ENTRY_TITLE_MAX}
          className={fieldInputClass}
        />
      </label>
      {gameRequired ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Associated game</p>
          {value.gameLabel ? (
            <div className="flex items-start gap-3">
              <div className="w-16 shrink-0">
                <GameCover
                  title={value.gameLabel}
                  imageUrl={value.gameCoverUrl}
                />
              </div>
              <p className="text-sm text-ink">
                {value.gameLabel}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    onChange({
                      ...value,
                      gameId: "",
                      gameLabel: null,
                      gameCoverUrl: null,
                    })
                  }
                >
                  Clear
                </button>
              </p>
            </div>
          ) : (
            <GameSearchField
              year={year}
              eligibility={
                customAnswerTypeUsesEligibility(answerType)
                  ? eligibility
                  : undefined
              }
              aria-label="Search games for entry"
              onSelect={(hit) =>
                onChange({
                  ...value,
                  gameId: hit.id,
                  gameLabel: hit.title,
                  gameCoverUrl: hit.coverUrl,
                })
              }
            />
          )}
        </div>
      ) : null}
      <label className="block text-sm text-muted">
        Description (optional)
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          maxLength={CUSTOM_ENTRY_DESCRIPTION_MAX}
          rows={2}
          className={fieldInputClass}
        />
      </label>
      <label className="block text-sm text-muted">
        Supporting link (YouTube or Twitch, optional)
        <input
          value={value.supportLinkUrl}
          onChange={(e) =>
            onChange({ ...value, supportLinkUrl: e.target.value })
          }
          className={fieldInputClass}
        />
      </label>
      {imageAllowed ? (
        <label className="block text-sm text-muted">
          Entry image (optional)
          <input
            type="file"
            accept="image/jpeg,image/webp"
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (value.imagePreviewUrl) {
                URL.revokeObjectURL(value.imagePreviewUrl);
              }
              onChange({
                ...value,
                imageFile: file,
                imagePreviewUrl: file ? URL.createObjectURL(file) : null,
              });
            }}
          />
        </label>
      ) : null}
      {value.imagePreviewUrl ? (
        <div className="relative h-24 w-[4.5rem] overflow-hidden border border-line">
          <Image
            src={value.imagePreviewUrl}
            alt=""
            fill
            className="object-cover"
            sizes="72px"
          />
        </div>
      ) : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="bordered" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={gameRequired && !value.gameId}
          onClick={onSave}
        >
          Add entry
        </Button>
      </div>
    </div>
  );
}

function EditCategorySheet({
  slug,
  year,
  category,
  name,
  description,
  eligibility,
  onNameChange,
  onDescriptionChange,
  onEligibilityChange,
  updateAction,
  updatePending,
  updateState,
  orderedEntryIds,
  onEntryOrderChange,
  onLocalUpdate,
  onClose,
}: {
  slug: string;
  year: number;
  category: CustomCategoryView;
  name: string;
  description: string;
  eligibility: CustomCategoryEligibility;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEligibilityChange: (value: CustomCategoryEligibility) => void;
  updateAction: (payload: FormData) => void;
  updatePending: boolean;
  updateState: { error: string } | { ok: true } | null;
  orderedEntryIds?: readonly string[];
  onEntryOrderChange?: (entryIds: string[]) => void;
  onLocalUpdate?: (category: CustomCategoryView) => void;
  onClose: () => void;
}) {
  const [entryForm, setEntryForm] = useState<EntryFormMode>({ kind: "list" });
  const showEntries = needsEntries(category.answerType);
  const focusingEntry = entryForm.kind !== "list";
  const isLocalDraft = Boolean(onLocalUpdate);

  return (
    <div className="space-y-6">
      {focusingEntry ? null : (
        <form
          action={
            isLocalDraft
              ? undefined
              : (fd) => {
                  fd.set("slug", slug);
                  fd.set("year", String(year));
                  fd.set("categoryId", category.id);
                  fd.set("name", name.trim());
                  fd.set("description", description.trim());
                  if (customAnswerTypeUsesEligibility(category.answerType)) {
                    fd.set("eligibility", eligibility);
                  }
                  updateAction(fd);
                }
          }
          onSubmit={
            isLocalDraft
              ? (event) => {
                  event.preventDefault();
                  onLocalUpdate?.({
                    ...category,
                    name: name.trim(),
                    description: description.trim(),
                    eligibility: customAnswerTypeUsesEligibility(
                      category.answerType,
                    )
                      ? eligibility
                      : category.eligibility,
                  });
                }
              : undefined
          }
          className="space-y-4"
        >
          <CategoryFields
            name={name}
            description={description}
            answerType={category.answerType}
            eligibility={eligibility}
            answerTypeEditable={false}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onEligibilityChange={onEligibilityChange}
          />
          {updateState && "error" in updateState ? (
            <p className="text-sm text-accent">{updateState.error}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={updatePending}>
              {updatePending ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      )}

      {showEntries && isLocalDraft ? (
        <div className="space-y-3 border-t border-line pt-4">
          <h5 className="text-sm font-semibold tracking-wide text-ink">
            Entries
          </h5>
          {category.entries.length === 0 ? (
            <p className="text-sm text-muted">No entries yet.</p>
          ) : (
            <ul className="space-y-0">
              {category.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-b border-line py-2 text-sm"
                >
                  <p className="font-semibold text-ink">{entry.title}</p>
                  {entry.gameTitle ? (
                    <p className="text-muted">{entry.gameTitle}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">
            Entry lists for new community awards are set when you create the
            category. You can adjust them after the event exists.
          </p>
        </div>
      ) : null}

      {showEntries && !isLocalDraft ? (
        <LiveEntriesPanel
          slug={slug}
          year={year}
          category={category}
          entryForm={entryForm}
          onEntryFormChange={setEntryForm}
          orderedEntryIds={orderedEntryIds}
          onEntryOrderChange={onEntryOrderChange}
        />
      ) : null}

      {!showEntries && !focusingEntry ? (
        <p className="border-t border-line pt-4 text-sm text-muted">
          {ANSWER_TYPE_HINTS.any_game}
        </p>
      ) : null}

      {entryForm.kind === "list" ? (
        <div className="flex flex-wrap justify-end border-t border-line pt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LiveEntriesPanel({
  slug,
  year,
  category,
  entryForm,
  onEntryFormChange,
  orderedEntryIds,
  onEntryOrderChange,
}: {
  slug: string;
  year: number;
  category: CustomCategoryView;
  entryForm: EntryFormMode;
  onEntryFormChange: (next: EntryFormMode) => void;
  orderedEntryIds?: readonly string[];
  onEntryOrderChange?: (entryIds: string[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supportLinkUrl, setSupportLinkUrl] = useState("");
  const [gameId, setGameId] = useState("");
  const [gameLabel, setGameLabel] = useState<string | null>(null);
  const [gameCoverUrl, setGameCoverUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dndId = useId();
  const sensors = useListCardDragSensors();
  useDragBodyScrollLock(dragging);
  const [entryState, , entryPending] = useActionState(
    createCustomCategoryEntryAction,
    null,
  );
  const [updateEntryState, , updateEntryPending] =
    useActionState(updateCustomCategoryEntryAction, null);
  const [, deleteEntryAction, deleteEntryPending] = useActionState(
    deleteCustomCategoryEntryAction,
    null,
  );
  const gameRequired = needsGame(category.answerType);
  const imageAllowed = allowsEntryImage(category.answerType);

  const entries = useMemo(() => {
    if (!orderedEntryIds || orderedEntryIds.length === 0) {
      return category.entries;
    }
    const byId = new Map(category.entries.map((e) => [e.id, e]));
    const ordered: CustomCategoryEntryView[] = [];
    for (const id of orderedEntryIds) {
      const hit = byId.get(id);
      if (hit) {
        ordered.push(hit);
        byId.delete(id);
      }
    }
    for (const entry of category.entries) {
      if (byId.has(entry.id)) ordered.push(entry);
    }
    return ordered;
  }, [category.entries, orderedEntryIds]);

  function resetFormFields(entry?: CustomCategoryEntryView | null) {
    setTitle(entry?.title ?? "");
    setDescription(entry?.description ?? "");
    setSupportLinkUrl(entry?.supportLinkUrl ?? "");
    setGameId(entry?.gameId ?? "");
    setGameLabel(entry?.gameTitle ?? null);
    setGameCoverUrl(entry?.coverUrl ?? null);
    setImageFile(null);
    setImagePreviewUrl(entry?.imageUrl ?? null);
    setLocalError(null);
  }

  useEffect(() => {
    if (entryForm.kind === "add") resetFormFields(null);
    if (entryForm.kind === "edit") resetFormFields(entryForm.entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when mode/entry changes
  }, [entryForm]);

  useEffect(() => {
    if (entryState && "ok" in entryState && entryState.ok) {
      onEntryFormChange({ kind: "list" });
      resetFormFields(null);
    }
  }, [entryState, onEntryFormChange]);

  useEffect(() => {
    if (updateEntryState && "ok" in updateEntryState && updateEntryState.ok) {
      onEntryFormChange({ kind: "list" });
      resetFormFields(null);
    }
  }, [updateEntryState, onEntryFormChange]);

  function onDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id || !onEntryOrderChange) return;
    const ids = entries.map((e) => e.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onEntryOrderChange(arrayMove(ids, oldIndex, newIndex));
  }

  async function submitEntry(formData: FormData) {
    setLocalError(null);
    if (!title.trim()) {
      setLocalError("Title is required.");
      return;
    }
    if (gameRequired && !gameId) {
      setLocalError("Choose an associated game.");
      return;
    }

    formData.set("slug", slug);
    formData.set("year", String(year));
    formData.set("title", title.trim());
    if (description.trim()) formData.set("description", description.trim());
    if (supportLinkUrl.trim()) {
      formData.set("supportLinkUrl", supportLinkUrl.trim());
    }
    if (gameId) formData.set("gameId", gameId);

    if (entryForm.kind === "add") {
      formData.set("categoryId", category.id);
      const result = await createCustomCategoryEntryAction(null, formData);
      if (!result || "error" in result) {
        setLocalError(result?.error ?? "Could not add entry.");
        return;
      }
      if (imageFile && imageAllowed) {
        const uploadFd = new FormData();
        uploadFd.set("slug", slug);
        uploadFd.set("year", String(year));
        uploadFd.set("entryId", result.entryId);
        uploadFd.set("image", imageFile);
        const uploaded = await uploadCustomCategoryImageAction(uploadFd);
        if (uploaded.error) {
          setLocalError(uploaded.error);
          return;
        }
      }
      onEntryFormChange({ kind: "list" });
      resetFormFields(null);
      return;
    }

    if (entryForm.kind === "edit") {
      formData.set("entryId", entryForm.entry.id);
      const result = await updateCustomCategoryEntryAction(null, formData);
      if (result && "error" in result) {
        setLocalError(result.error);
        return;
      }
      if (imageFile && imageAllowed) {
        const uploadFd = new FormData();
        uploadFd.set("slug", slug);
        uploadFd.set("year", String(year));
        uploadFd.set("entryId", entryForm.entry.id);
        uploadFd.set("image", imageFile);
        const uploaded = await uploadCustomCategoryImageAction(uploadFd);
        if (uploaded.error) {
          setLocalError(uploaded.error);
          return;
        }
      }
      onEntryFormChange({ kind: "list" });
      resetFormFields(null);
    }
  }

  if (entryForm.kind !== "list") {
    const formError =
      localError ||
      (entryForm.kind === "add" && entryState && "error" in entryState
        ? entryState.error
        : null) ||
      (entryForm.kind === "edit" &&
      updateEntryState &&
      "error" in updateEntryState
        ? updateEntryState.error
        : null);
    const pending = entryPending || updateEntryPending;

    return (
      <div className="space-y-3 border-t border-line pt-4">
        <h5 className="text-sm font-semibold tracking-wide text-ink">
          {entryForm.kind === "add" ? "Add entry" : "Edit entry"}
        </h5>
        <form action={submitEntry} className="space-y-3">
          <label className="block text-sm text-muted">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={CUSTOM_ENTRY_TITLE_MAX}
              className={fieldInputClass}
            />
          </label>
          {gameRequired ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Associated game</p>
              {gameLabel ? (
                <div className="flex items-start gap-3">
                  <div className="w-16 shrink-0">
                    <GameCover title={gameLabel} imageUrl={gameCoverUrl} />
                  </div>
                  <p className="text-sm text-ink">
                    {gameLabel}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        setGameId("");
                        setGameLabel(null);
                        setGameCoverUrl(null);
                      }}
                    >
                      Clear
                    </button>
                  </p>
                </div>
              ) : (
                <GameSearchField
                  year={year}
                  eligibility={
                    customAnswerTypeUsesEligibility(category.answerType)
                      ? parseCustomCategoryEligibility(category.eligibility)
                      : undefined
                  }
                  aria-label="Search games for entry"
                  onSelect={(hit) => {
                    setGameId(hit.id);
                    setGameLabel(hit.title);
                    setGameCoverUrl(hit.coverUrl);
                  }}
                />
              )}
            </div>
          ) : null}
          <label className="block text-sm text-muted">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CUSTOM_ENTRY_DESCRIPTION_MAX}
              rows={2}
              className={fieldInputClass}
            />
          </label>
          <label className="block text-sm text-muted">
            Supporting link (YouTube or Twitch, optional)
            <input
              value={supportLinkUrl}
              onChange={(e) => setSupportLinkUrl(e.target.value)}
              className={fieldInputClass}
            />
          </label>
          {imageAllowed ? (
            <label className="block text-sm text-muted">
              Entry image (optional)
              <input
                type="file"
                accept="image/jpeg,image/webp"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  setImagePreviewUrl(
                    file
                      ? URL.createObjectURL(file)
                      : (entryForm.kind === "edit"
                          ? entryForm.entry.imageUrl
                          : null),
                  );
                }}
              />
            </label>
          ) : null}
          {imagePreviewUrl ? (
            <div className="relative h-24 w-[4.5rem] overflow-hidden border border-line">
              <Image
                src={imagePreviewUrl}
                alt=""
                fill
                className="object-cover"
                sizes="72px"
              />
            </div>
          ) : null}
          {formError ? <p className="text-sm text-accent">{formError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="bordered"
              disabled={pending}
              onClick={() => onEntryFormChange({ kind: "list" })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || (gameRequired && !gameId)}
            >
              {pending
                ? entryForm.kind === "add" ? "Adding…" : "Saving…"
                : entryForm.kind === "add" ? "Add entry"
                  : "Save entry"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const canReorder = Boolean(onEntryOrderChange) && entries.length > 1;

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h5 className="text-sm font-semibold tracking-wide text-ink">
            Entries
          </h5>
          <p className="mt-1 text-sm text-muted">
            Options on the ballot for this award.
            {canReorder
              ? " Hold the handle to reorder; save with event settings."
              : null}
          </p>
        </div>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          onClick={() => onEntryFormChange({ kind: "add" })}
        >
          Add entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">No entries yet.</p>
      ) : canReorder ? (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragging(false)}
        >
          <SortableContext
            items={entries.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-0">
              {entries.map((entry) => (
                <SortableEntryRow
                  key={entry.id}
                  entry={entry}
                  slug={slug}
                  year={year}
                  deleteEntryAction={deleteEntryAction}
                  deleteEntryPending={deleteEntryPending}
                  onEdit={() => onEntryFormChange({ kind: "edit", entry })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="space-y-0">
          {entries.map((entry) => (
            <EntryRowStatic
              key={entry.id}
              entry={entry}
              slug={slug}
              year={year}
              deleteEntryAction={deleteEntryAction}
              deleteEntryPending={deleteEntryPending}
              onEdit={() => onEntryFormChange({ kind: "edit", entry })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRowStatic({
  entry,
  slug,
  year,
  deleteEntryAction,
  deleteEntryPending,
  onEdit,
}: {
  entry: CustomCategoryEntryView;
  slug: string;
  year: number;
  deleteEntryAction: (payload: FormData) => void;
  deleteEntryPending: boolean;
  onEdit: () => void;
}) {
  const media = entry.imageUrl || entry.coverUrl;
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-line py-2 text-sm">
      <div className="flex min-w-0 flex-1 gap-3">
        {media ? (
          <div className="relative h-14 w-10 shrink-0 overflow-hidden border border-line">
            <Image
              src={media}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold text-ink">{entry.title}</p>
          {entry.gameTitle ? (
            <p className="text-muted">{entry.gameTitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="bordered" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <form action={deleteEntryAction} className="inline">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="entryId" value={entry.id} />
          <Button
            type="submit"
            variant="danger-bordered"
            size="sm"
            disabled={deleteEntryPending}
          >
            Remove
          </Button>
        </form>
      </div>
    </li>
  );
}

function SortableEntryRow({
  entry,
  slug,
  year,
  deleteEntryAction,
  deleteEntryPending,
  onEdit,
}: {
  entry: CustomCategoryEntryView;
  slug: string;
  year: number;
  deleteEntryAction: (payload: FormData) => void;
  deleteEntryPending: boolean;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });
  const media = entry.imageUrl || entry.coverUrl;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch border-b border-line text-sm ${cardTouchLockClassName} ${
        isDragging ? "z-10 bg-panel opacity-90 shadow-lg" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2 py-2 pr-2">
        <div className="flex min-w-0 flex-1 gap-3">
          {media ? (
            <div className="relative h-14 w-10 shrink-0 overflow-hidden border border-line">
              <Image
                src={media}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="font-semibold text-ink">{entry.title}</p>
            {entry.gameTitle ? (
              <p className="text-muted">{entry.gameTitle}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="bordered" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <form action={deleteEntryAction} className="inline">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="entryId" value={entry.id} />
            <Button
              type="submit"
              variant="danger-bordered"
              size="sm"
              disabled={deleteEntryPending}
            >
              Remove
            </Button>
          </form>
        </div>
      </div>
      <div className="flex shrink-0 items-center border-l border-line">
        <ListDragHandle attributes={attributes} listeners={listeners} />
      </div>
    </li>
  );
}

