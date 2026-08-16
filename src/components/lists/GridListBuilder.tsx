"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  cardSelectedRingClassName,
  cardTouchLockClassName,
  mergeHoldDragListeners,
  useDragBodyScrollLock,
  useListCardDragSensors,
} from "@/components/lists/cardChrome";
import { ListCardActionMenu } from "@/components/lists/ListCardActionMenu";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";

export type GridListItem = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export function GridListBuilder({
  items,
  slotCount,
  onReorder,
  onRemove,
  onPickEmpty,
}: {
  items: GridListItem[];
  slotCount: number;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onPickEmpty: () => void;
}) {
  const dndId = useId();
  const sensors = useListCardDragSensors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOccurredRef = useRef(false);
  const emptySlots = Math.max(0, slotCount - items.length);
  useDragBodyScrollLock(dragging);

  useEffect(() => {
    if (!selectedId) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest(`[data-list-card="${selectedId}"]`)) return;
      if (target.closest("[data-list-card-menu]")) return;
      setSelectedId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedId]);

  function onDragStart() {
    dragOccurredRef.current = true;
    setDragging(true);
    setSelectedId(null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
      }
    }
    window.setTimeout(() => {
      dragOccurredRef.current = false;
    }, 0);
  }

  return (
    <div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragging(false);
          window.setTimeout(() => {
            dragOccurredRef.current = false;
          }, 0);
        }}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item, index) => (
              <SortableGridCard
                key={item.id}
                item={item}
                rank={index + 1}
                selected={selectedId === item.id}
                onSelect={() => {
                  if (dragOccurredRef.current) return;
                  setSelectedId((curr) => (curr === item.id ? null : item.id));
                }}
                onRemove={() => {
                  onRemove(item.id);
                  setSelectedId(null);
                }}
              />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <li key={`empty-${i}`} className="min-w-0 list-none">
                <button
                  type="button"
                  onClick={onPickEmpty}
                  className="flex w-full flex-col gap-2 text-left"
                >
                  <div className="aspect-[3/4] w-full border border-dashed border-line bg-panel transition-colors hover:border-accent" />
                  <p className="text-xs text-muted">
                    <span className="font-display text-sm text-accent/60">
                      {items.length + i + 1}
                    </span>{" "}
                    Empty
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="mt-3 text-center text-xs text-muted">
        {items.length === 0
          ? "Tap an empty slot or search to add games."
          : "Hold to reorder. Tap a game to remove."}
      </p>
    </div>
  );
}

function SortableGridCard({
  item,
  rank,
  selected,
  onSelect,
  onRemove,
}: {
  item: GridListItem;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const holdListeners = mergeHoldDragListeners(listeners);

  return (
    <li
      ref={setNodeRef}
      data-list-card={item.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`min-w-0 list-none ${isDragging ? "z-10 opacity-90" : ""}`}
    >
      <div
        {...attributes}
        {...holdListeners}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-label={`${item.title}, rank ${rank}. Tap for options, hold to move.`}
        aria-pressed={selected}
        className={`flex flex-col gap-2 text-left outline-none ${cardTouchLockClassName}`}
      >
        <div
          className={`relative ${selected ? cardSelectedRingClassName : ""}`}
        >
          <GameCover title={item.title} imageUrl={item.coverUrl} />
          {selected ? <ListCardActionMenu onRemove={onRemove} /> : null}
        </div>
        <div className="flex min-w-0 items-start gap-1.5">
          <RankMarker rank={rank} size="sm" />
          <p className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-snug text-ink">
            {item.title}
          </p>
        </div>
      </div>
    </li>
  );
}
