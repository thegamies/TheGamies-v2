"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  cardTouchLockClassName,
  mergeHoldDragListeners,
  useDragBodyScrollLock,
  useListCardDragSensors,
} from "@/components/lists/cardChrome";
import {
  saveEditionBallotAction,
  type SaveEditionBallotState,
} from "@/app/communities/actions";
import { type GameSearchHit } from "@/app/create/search-actions";
import {
  CategoryVotesEditor,
  type AwardCategoryOption,
  type CategoryVoteSelection,
} from "@/components/lists/CategoryVotesEditor";
import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { GameSearchField } from "@/components/ui/GameSearchField";
import { PinnedSaveBar } from "@/components/ui/PinnedSaveBar";
import { BallotRankGrid } from "@/components/communities/BallotRankGrid";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import {
  capEditionBallotItems,
  editionBallotDraftKey,
  EDITION_BALLOT_MAX_ITEMS,
} from "@/lib/communities/ballot-schema";

export type EditionBallotEditorItem = {
  gameId: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  rank: number;
  blurb: string;
};

type Props = {
  slug: string;
  year: number;
  initialItems: EditionBallotEditorItem[];
  initialCategoryVotes: CategoryVoteSelection[];
  awardCategories: AwardCategoryOption[];
  /** Top 10 from the viewer's site GOTY list for this year, if one exists. */
  siteGotyItems?: EditionBallotEditorItem[] | null;
};

function withRanks(items: EditionBallotEditorItem[]): EditionBallotEditorItem[] {
  return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

function draftKey(
  items: EditionBallotEditorItem[],
  votes: CategoryVoteSelection[],
): string {
  return editionBallotDraftKey({
    items,
    categoryVotes: votes.map((vote) => ({
      categoryId: vote.categoryId,
      gameId: vote.gameId,
    })),
  });
}

export function EditionBallotEditor({
  slug,
  year,
  initialItems,
  initialCategoryVotes,
  awardCategories,
  siteGotyItems = null,
}: Props) {
  const dndId = useId();
  const [items, setItems] = useState(() =>
    withRanks(capEditionBallotItems(initialItems)),
  );
  const [categoryVotes, setCategoryVotes] = useState(initialCategoryVotes);
  const [confirmImport, setConfirmImport] = useState(false);
  const [savedKey, setSavedKey] = useState(() =>
    draftKey(
      withRanks(capEditionBallotItems(initialItems)),
      initialCategoryVotes,
    ),
  );
  const submittedKeyRef = useRef<string | null>(null);
  const [state, formAction, pending] = useActionState(
    saveEditionBallotAction,
    null as SaveEditionBallotState,
  );

  const currentKey = draftKey(items, categoryVotes);
  const dirty = currentKey !== savedKey;
  const { dialog: unsavedDialog } = useUnsavedChangesGuard(dirty, {
    message: "Leave without saving? Your latest edits won’t be kept on this ballot.",
  });

  useEffect(() => {
    if (!state) return;
    if (state.saved && submittedKeyRef.current) {
      setSavedKey(submittedKeyRef.current);
    }
    submittedKeyRef.current = null;
  }, [state]);

  const isFull = items.length >= EDITION_BALLOT_MAX_ITEMS;
  const canImport = Boolean(siteGotyItems && siteGotyItems.length > 0);
  const addedIds = new Set(items.map((item) => item.gameId));

  const sensors = useListCardDragSensors();
  const [dragging, setDragging] = useState(false);
  useDragBodyScrollLock(dragging);

  function addGame(hit: GameSearchHit) {
    if (items.some((i) => i.gameId === hit.id)) return;
    if (hit.year != null && hit.year !== year) return;
    if (items.length >= EDITION_BALLOT_MAX_ITEMS) return;
    setItems((prev) =>
      withRanks([
        ...prev,
        {
          gameId: hit.id,
          igdbId: hit.igdbId,
          slug: hit.slug,
          title: hit.title,
          year: hit.year,
          coverUrl: hit.coverUrl,
          rank: prev.length + 1,
          blurb: "",
        },
      ]),
    );
  }

  function removeGame(gameId: string) {
    setItems((prev) => withRanks(prev.filter((item) => item.gameId !== gameId)));
  }

  function applyImport() {
    if (!siteGotyItems || siteGotyItems.length === 0) return;
    setItems(withRanks(capEditionBallotItems(siteGotyItems)));
    setConfirmImport(false);
  }

  function onImportClick() {
    if (!canImport) return;
    if (items.length > 0) {
      setConfirmImport(true);
      return;
    }
    applyImport();
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.gameId === active.id);
      const newIndex = prev.findIndex((item) => item.gameId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return withRanks(arrayMove(prev, oldIndex, newIndex));
    });
  }

  return (
    <div className={`mt-8 space-y-10 ${dirty ? "pb-24" : ""}`}>
      <section>
        <BallotChapterHeader
          eyebrow="Top 10"
          title="Game of the Year"
          description={`Rank up to ${EDITION_BALLOT_MAX_ITEMS} games from ${year}. Hold to reorder.`}
          actions={
            canImport ? (
              <Button
                type="button"
                variant="bordered"
                size="sm"
                onClick={onImportClick}
              >
                Import your Game of the Year list
              </Button>
            ) : null
          }
        />
        <div className="mt-6">
          <GameSearchField
            year={year}
            onSelect={addGame}
            aria-label={`Search ${year} games`}
            isFull={isFull}
            fullMessage={`Your ranking is full (${EDITION_BALLOT_MAX_ITEMS} of ${EDITION_BALLOT_MAX_ITEMS}).`}
            excludeIds={addedIds}
          />
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            Search to add games to your top 10.
          </p>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setDragging(true)}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(false)}
          >
            <SortableContext
              items={items.map((item) => item.gameId)}
              strategy={rectSortingStrategy}
            >
              <BallotRankGrid>
                {items.map((item, index) => (
                  <BallotGridCard
                    key={item.gameId}
                    item={item}
                    rank={index + 1}
                    onRemove={removeGame}
                  />
                ))}
              </BallotRankGrid>
            </SortableContext>
          </DndContext>
        )}
        <p className="mt-4 text-xs text-muted">
          {items.length} of {EDITION_BALLOT_MAX_ITEMS} · hold to reorder
        </p>
      </section>

      {awardCategories.length > 0 ? (
        <CategoryVotesEditor
          key={year}
          categories={awardCategories}
          value={categoryVotes}
          onChange={setCategoryVotes}
          year={year}
          catalogMode="fixed"
          description="Choose one game per category for this event."
        />
      ) : null}

      {dirty ? (
        <form
          action={formAction}
          onSubmit={() => {
            submittedKeyRef.current = currentKey;
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="year" value={String(year)} />
          <input
            type="hidden"
            name="itemsJson"
            value={JSON.stringify(
              items.map((item) => ({
                gameId: item.gameId,
                rank: item.rank,
                blurb: item.blurb.trim() ? item.blurb : null,
              })),
            )}
          />
          <input
            type="hidden"
            name="categoryVotesJson"
            value={JSON.stringify(
              categoryVotes.map((v) => ({
                categoryId: v.categoryId,
                gameId: v.gameId,
              })),
            )}
          />
          <PinnedSaveBar
            message={
              state?.error ? (
                <span className="text-accent">{state.error}</span>
              ) : (
                "Unsaved changes"
              )
            }
          >
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save ballot"}
            </Button>
          </PinnedSaveBar>
        </form>
      ) : null}

      {confirmImport ? (
        <ConfirmDialog
          title="Replace your ranking?"
          message="Importing your Game of the Year list will remove the games already on this ballot."
          confirmLabel="Import anyway"
          onCancel={() => setConfirmImport(false)}
          onConfirm={applyImport}
        />
      ) : null}

      {unsavedDialog}
    </div>
  );
}

function BallotGridCard({
  item,
  rank,
  onRemove,
}: {
  item: EditionBallotEditorItem;
  rank: number;
  onRemove: (gameId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.gameId });
  const holdListeners = mergeHoldDragListeners(listeners);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`min-w-0 ${isDragging ? "z-10 opacity-90" : ""}`}
    >
      <button
        type="button"
        className={`w-full cursor-grab text-left active:cursor-grabbing ${cardTouchLockClassName}`}
        aria-label={`Hold to reorder ${item.title}`}
        onContextMenu={(event) => event.preventDefault()}
        {...attributes}
        {...holdListeners}
      >
        <GameCover title={item.title} imageUrl={item.coverUrl} />
        <div className="mt-2 flex items-start gap-1">
          <span
            className="shrink-0 font-display text-[18px] leading-none tracking-wide text-accent"
            aria-hidden
          >
            {rank}
          </span>
          <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-ink">
            {item.title}
          </span>
        </div>
      </button>
      <button
        type="button"
        className="mt-1 text-xs text-muted hover:text-ink"
        onClick={() => onRemove(item.gameId)}
      >
        Remove
      </button>
    </li>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ballot-import-title"
        className="w-full max-w-md border border-line bg-panel p-5"
      >
        <p
          id="ballot-import-title"
          className="font-display text-2xl tracking-wide text-ink"
        >
          {title}
        </p>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="bordered" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
