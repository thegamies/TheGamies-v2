"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  saveEditionBallotAction,
  type SaveEditionBallotState,
} from "@/app/communities/actions";
import {
  searchGamesForList,
  type GameSearchHit,
} from "@/app/create/search-actions";
import {
  CategoryVotesEditor,
  type AwardCategoryOption,
  type CategoryVoteSelection,
} from "@/components/lists/CategoryVotesEditor";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import { LIST_MAX_ITEMS } from "@/lib/lists/schema";

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
};

function withRanks(items: EditionBallotEditorItem[]): EditionBallotEditorItem[] {
  return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

export function EditionBallotEditor({
  slug,
  year,
  initialItems,
  initialCategoryVotes,
  awardCategories,
}: Props) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(withRanks(initialItems));
  const [categoryVotes, setCategoryVotes] = useState(initialCategoryVotes);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GameSearchHit[]>([]);
  const [searchPending, startSearch] = useTransition();
  const [state, formAction, pending] = useActionState(
    saveEditionBallotAction,
    null as SaveEditionBallotState,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function setSearchQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) {
      setHits([]);
      return;
    }
    const q = next.trim();
    startSearch(async () => {
      const results = await searchGamesForList({
        q,
        year,
        gotyMode: true,
      });
      setHits(results);
    });
  }

  function addGame(hit: GameSearchHit) {
    if (items.some((i) => i.gameId === hit.id)) return;
    if (hit.year != null && hit.year !== year) return;
    if (items.length >= LIST_MAX_ITEMS) return;
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
    setQuery("");
    setHits([]);
  }

  function removeGame(gameId: string) {
    setItems((prev) => withRanks(prev.filter((item) => item.gameId !== gameId)));
  }

  function setBlurb(gameId: string, blurb: string) {
    setItems((prev) =>
      prev.map((item) => (item.gameId === gameId ? { ...item, blurb } : item)),
    );
  }

  function onDragEnd(event: DragEndEvent) {
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
    <div className="mt-8 space-y-10">
      <section>
        <label htmlFor={searchId} className="sr-only">
          Search games
        </label>
        <input
          ref={searchRef}
          id={searchId}
          className={fieldInputClass}
          value={query}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${year} games`}
        />
        {searchPending ? (
          <p className="mt-2 text-xs text-muted">Searching…</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="mt-2 max-h-56 overflow-auto border border-line">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-panel"
                  onClick={() => addGame(hit)}
                >
                  <div className="w-8 shrink-0">
                    <GameCover title={hit.title} imageUrl={hit.coverUrl} />
                  </div>
                  <span>{hit.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => searchRef.current?.focus()}
            className="w-full border border-dashed border-line px-4 py-10 text-left text-muted transition-colors hover:border-accent hover:text-ink"
          >
            Search and add games to build your Game of the Year ranking.
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.gameId)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-3">
                {items.map((item, index) => (
                  <BallotRankCard
                    key={item.gameId}
                    item={item}
                    rank={index + 1}
                    onBlurbChange={setBlurb}
                    onRemove={removeGame}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        <p className="mt-4 text-xs text-muted">
          {items.length} of {LIST_MAX_ITEMS} slots · drag to reorder
        </p>
      </section>

      {awardCategories.length > 0 ? (
        <CategoryVotesEditor
          key={year}
          categories={awardCategories}
          value={categoryVotes}
          onChange={setCategoryVotes}
          year={year}
          description="Choose one game per category for this edition."
        />
      ) : null}

      <form action={formAction} className="border-t border-line pt-6">
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
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save ballot"}
        </Button>
        {state?.error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.saved ? (
          <p className="mt-3 text-sm text-muted" role="status">
            Ballot saved. You can keep editing until voting closes.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function BallotRankCard({
  item,
  rank,
  onBlurbChange,
  onRemove,
}: {
  item: EditionBallotEditorItem;
  rank: number;
  onBlurbChange: (gameId: string, blurb: string) => void;
  onRemove: (gameId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.gameId });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-stretch border border-line bg-panel ${
        isDragging ? "z-10 opacity-90 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="flex w-12 shrink-0 cursor-grab items-center justify-center border-r border-line text-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <RankMarker rank={rank} />
      </button>
      <div className="flex min-w-0 flex-1 items-start gap-3 p-3">
        <div className="w-12 shrink-0">
          <GameCover title={item.title} imageUrl={item.coverUrl} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{item.title}</p>
          <textarea
            className={`${fieldInputClass} mt-2 min-h-[4.5rem] resize-y`}
            value={item.blurb}
            onChange={(e) => onBlurbChange(item.gameId, e.target.value)}
            placeholder="Optional note"
            maxLength={500}
            aria-label={`Note for ${item.title}`}
          />
        </div>
        <Button
          type="button"
          variant="quiet"
          className="px-0 py-0"
          onClick={() => onRemove(item.gameId)}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
