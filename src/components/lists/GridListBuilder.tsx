"use client";

import { useId } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  cardMoveButtonClassName,
  cardRemoveButtonClassName,
} from "@/components/lists/cardChrome";
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const emptySlots = Math.max(0, slotCount - items.length);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
  }

  return (
    <div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
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
                onRemove={onRemove}
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
          : "Use the move control to reorder. Tap an empty slot to add more."}
      </p>
    </div>
  );
}

function SortableGridCard({
  item,
  rank,
  onRemove,
}: {
  item: GridListItem;
  rank: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`min-w-0 list-none ${isDragging ? "z-10 opacity-90" : ""}`}
    >
      <div className="flex flex-col gap-2">
        <div className="relative">
          <GameCover title={item.title} imageUrl={item.coverUrl} />
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.title}`}
            className={cardRemoveButtonClassName}
          >
            ✕
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.title}`}
            className={cardMoveButtonClassName}
          >
            ⠿
          </button>
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
