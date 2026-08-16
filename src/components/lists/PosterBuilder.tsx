"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AwardsExportFooter,
  AwardsExportHeader,
  AwardsPosterBackground,
  AWARDS_FOOTER_PX,
  awardsHeaderLineY,
} from "@/components/list-export/ListExportAwardsLayout";
import {
  AWARDS_GRID_GAP,
  AWARDS_GRID_TOP_PAD,
  AWARDS_HEADER_BAND_PX,
  AWARDS_SIDE_PAD,
  awardsSizesForLayout,
  buildAwardsRows,
} from "@/components/list-export/exportAwardsGrid";
import {
  exportRankBannerBelowHeight,
  SocialGamerCardImageFrame,
} from "@/components/list-export/SocialGamerCardImageFrame";
import {
  formatExportRank,
  rankChromeForStyle,
  type ExportRankChromeConfig,
  type ExportRankFormat,
  type ExportRankStyle,
} from "@/components/list-export/rankChrome";
import type {
  ExportGame,
  ListExportListType,
} from "@/components/list-export/listExportTypes";
import { cardOuterRadius } from "@/components/list-export/socialGamerCardTheme";
import {
  cardTouchLockClassName,
  mergeHoldDragListeners,
  useDragBodyScrollLock,
  useListCardDragSensors,
} from "@/components/lists/cardChrome";
import { ListCardActionMenu } from "@/components/lists/ListCardActionMenu";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const CANVAS_W = 1080;
const CANVAS_H = 1350;

export type PosterItem = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export function PosterBuilder({
  items,
  slotCount,
  year,
  title,
  listType = "goty",
  debug = false,
  rankStyle = "chip",
  rankFormat = "ordinal",
  showYearBadge = true,
  showTopCount = false,
  onReorder,
  onRemove,
  onPickEmpty,
}: {
  items: PosterItem[];
  slotCount: number;
  year: number;
  title: string;
  listType?: ListExportListType;
  debug?: boolean;
  rankStyle?: ExportRankStyle;
  rankFormat?: ExportRankFormat;
  showYearBadge?: boolean;
  showTopCount?: boolean;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onPickEmpty?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dndId = useId();
  const [scale, setScale] = useState(0.4);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CANVAS_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sensors = useListCardDragSensors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragOccurredRef = useRef(false);
  useDragBodyScrollLock(activeId != null);

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

  const chrome = useMemo(
    () => rankChromeForStyle(rankStyle, rankFormat),
    [rankStyle, rankFormat],
  );
  const hideRanks = chrome.mode === "none";
  const filledIds = items.map((i) => i.id);

  const { rows, cardByRow, rankScaleWidth } = useMemo(() => {
    const placeholders: ExportGame[] = Array.from(
      { length: Math.max(1, slotCount) },
      (_, i) => ({ id: `slot-${i}`, title: "", imageUrl: null }),
    );
    const builtRows = buildAwardsRows(placeholders);
    const contentW = CANVAS_W - AWARDS_SIDE_PAD * 2;
    const contentH =
      CANVAS_H - AWARDS_HEADER_BAND_PX - AWARDS_FOOTER_PX - AWARDS_GRID_TOP_PAD;

    const { cardByRow: sized } = awardsSizesForLayout(
      contentW,
      contentH,
      builtRows,
      AWARDS_GRID_GAP,
      (cardW) => exportRankBannerBelowHeight(cardW, chrome),
    );
    const scaleW = Math.max(1, ...sized.map((c) => c.w));
    const { cardByRow: finalSized } = awardsSizesForLayout(
      contentW,
      contentH,
      builtRows,
      AWARDS_GRID_GAP,
      () => exportRankBannerBelowHeight(scaleW, chrome),
    );
    return { rows: builtRows, cardByRow: finalSized, rankScaleWidth: scaleW };
  }, [slotCount, chrome]);

  const bannerH = exportRankBannerBelowHeight(rankScaleWidth, chrome);


  const handleDragStart = (event: DragStartEvent) => {
    dragOccurredRef.current = true;
    setSelectedId(null);
    setActiveId(String(event.active.id));
  };

  // Commit the reorder once, on drop. Reordering live during the drag causes an
  // infinite oscillation when cards have different sizes across rows (a swap
  // shifts the layout so the collision immediately re-triggers). dnd-kit's
  // sorting strategy provides the animated live preview instead.
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const from = filledIds.indexOf(String(active.id));
      const to = filledIds.indexOf(String(over.id));
      if (from >= 0 && to >= 0) onReorder(arrayMove(filledIds, from, to));
    }
    window.setTimeout(() => {
      dragOccurredRef.current = false;
    }, 0);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    window.setTimeout(() => {
      dragOccurredRef.current = false;
    }, 0);
  };

  const debugStats = useMemo(() => {
    if (!debug) return null;
    const perRow = rows.map((row, i) => ({
      count: row.ranks.length,
      w: cardByRow[i]!.w,
      h: cardByRow[i]!.h,
    }));
    if (perRow.length === 0) return null;

    const largest = perRow.reduce((a, c) => (c.w > a.w ? c : a), perRow[0]!);
    const smallest = perRow.reduce((a, c) => (c.w < a.w ? c : a), perRow[0]!);
    const canvasArea = CANVAS_W * CANVAS_H;
    const contentW = CANVAS_W - AWARDS_SIDE_PAD * 2;
    const contentH =
      CANVAS_H - AWARDS_HEADER_BAND_PX - AWARDS_FOOTER_PX - AWARDS_GRID_TOP_PAD;
    const footprint = (c: { w: number; h: number }) => c.w * (c.h + bannerH);
    const usedArea = perRow.reduce((s, c) => s + footprint(c) * c.count, 0);
    const pct = (x: number) => Math.round(x * 10) / 10;

    return {
      slots: slotCount,
      distribution: perRow.map((r) => r.count).join(" / "),
      largest: {
        w: Math.round(largest.w),
        h: Math.round(largest.h + bannerH),
        widthPct: pct((largest.w / CANVAS_W) * 100),
        areaPct: pct((footprint(largest) / canvasArea) * 100),
      },
      smallest: {
        w: Math.round(smallest.w),
        h: Math.round(smallest.h + bannerH),
        widthPct: pct((smallest.w / CANVAS_W) * 100),
        areaPct: pct((footprint(smallest) / canvasArea) * 100),
      },
      parityPct: pct((smallest.w / largest.w) * 100),
      coveragePct: pct((usedArea / (contentW * contentH)) * 100),
    };
  }, [debug, rows, cardByRow, bannerH, slotCount]);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <div ref={containerRef} className="w-full">
      <div style={{ position: "relative", width: "100%", height: CANVAS_H * scale }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            style={{
              position: "relative",
              width: CANVAS_W,
              height: CANVAS_H,
              overflow: activeId ? "visible" : "hidden",
            }}
          >
            <AwardsPosterBackground
              width={CANVAS_W}
              height={CANVAS_H}
              headerLineY={awardsHeaderLineY()}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                minHeight: 0,
              }}
            >
              <AwardsExportHeader
                year={year}
                topCount={slotCount}
                listType={listType}
                heightPx={AWARDS_HEADER_BAND_PX}
                widthPx={CANVAS_W}
                title={title}
                showYearBadge={showYearBadge}
                showTopCount={showTopCount}
              />

                <SortableContext items={filledIds} strategy={rectSortingStrategy}>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: AWARDS_GRID_GAP,
                      padding: `${AWARDS_GRID_TOP_PAD}px ${AWARDS_SIDE_PAD}px 0`,
                      boxSizing: "border-box",
                    }}
                  >
                    {rows.map((row, rowIndex) => {
                      const { w, h } = cardByRow[rowIndex]!;
                      const rowH = h + bannerH;
                      return (
                        <div
                          key={row.ranks.join("-")}
                          style={{
                            width: CANVAS_W - AWARDS_SIDE_PAD * 2,
                            height: rowH,
                            display: "flex",
                            alignItems: "stretch",
                            justifyContent: "center",
                            gap: AWARDS_GRID_GAP,
                            flexShrink: 0,
                          }}
                        >
                          {row.ranks.map((rank) => {
                            const item = items[rank - 1];
                            if (item) {
                              return (
                                <SortableCard
                                  key={item.id}
                                  id={item.id}
                                  game={{
                                    id: item.id,
                                    title: item.title,
                                    imageUrl: item.coverUrl,
                                  }}
                                  rank={rank}
                                  width={w}
                                  height={h}
                                  rankScaleWidth={rankScaleWidth}
                                  rankChrome={chrome}
                                  scale={scale}
                                  selected={selectedId === item.id}
                                  onSelect={() => {
                                    if (dragOccurredRef.current) return;
                                    setSelectedId((curr) =>
                                      curr === item.id ? null : item.id,
                                    );
                                  }}
                                />
                              );
                            }
                            return (
                              <EmptySlot
                                key={`empty-${rank}`}
                                rank={rank}
                                width={w}
                                height={h}
                                bannerH={bannerH}
                                showRank={!hideRanks}
                                onClick={onPickEmpty}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>

              <AwardsExportFooter heightPx={AWARDS_FOOTER_PX} widthPx={CANVAS_W} />
            </div>
          </div>
        </div>
      </div>

      {debugStats ? (
        <div className="mt-3 border border-[var(--line)] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]">
          <div className="mb-1 font-bold tracking-[0.16em] text-[var(--accent)] uppercase">
            Layout debug
          </div>
          <div>
            slots {debugStats.slots} · rows {debugStats.distribution} · canvas{" "}
            {CANVAS_W}×{CANVAS_H}
          </div>
          <div>
            <span className="text-[var(--ink)]">largest</span>{" "}
            {debugStats.largest.w}×{debugStats.largest.h}px · {debugStats.largest.widthPct}
            % width · {debugStats.largest.areaPct}% area
          </div>
          <div>
            <span className="text-[var(--ink)]">smallest</span>{" "}
            {debugStats.smallest.w}×{debugStats.smallest.h}px ·{" "}
            {debugStats.smallest.widthPct}% width · {debugStats.smallest.areaPct}% area
          </div>
          <div>
            size parity (small/large){" "}
            <span className="text-[var(--ink)]">{debugStats.parityPct}%</span> · area used{" "}
            <span className="text-[var(--ink)]">{debugStats.coveragePct}%</span>
          </div>
        </div>
      ) : null}

      {selectedId ? (
        <ListCardActionMenu
          anchorId={selectedId}
          onRemove={() => {
            onRemove(selectedId);
            setSelectedId(null);
          }}
        />
      ) : null}
    </div>
    </DndContext>
  );
}

function SortableCard({
  id,
  game,
  rank,
  width,
  height,
  rankScaleWidth,
  rankChrome,
  scale,
  selected,
  onSelect,
}: {
  id: string;
  game: ExportGame;
  rank: number;
  width: number;
  height: number;
  rankScaleWidth: number;
  rankChrome: ExportRankChromeConfig;
  scale: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const holdListeners = mergeHoldDragListeners(listeners);

  // dnd-kit's sorting strategy animates the displaced siblings (including across
  // rows) via `transform`. Those values are measured in on-screen (scaled)
  // pixels, but the transform is applied inside the `scale()` canvas — so divide
  // by `scale` to move the correct visual distance ("all the way" to the slot).
  const shift =
    transform && scale > 0
      ? CSS.Transform.toString({
          ...transform,
          x: transform.x / scale,
          y: transform.y / scale,
        })
      : undefined;

  return (
    <div
      ref={setNodeRef}
      data-list-card={id}
      style={{
        position: "relative",
        width,
        flexShrink: 0,
        transform: shift,
        transition,
        opacity: isDragging ? 0.92 : 1,
        zIndex: isDragging ? 20 : undefined,
        outline: selected ? "3px solid var(--accent)" : undefined,
        outlineOffset: 4,
        boxShadow: isDragging
          ? "0 0 0 6px rgba(255,90,31,0.9), 0 24px 60px rgba(0,0,0,0.7)"
          : undefined,
        cursor: isDragging ? "grabbing" : undefined,
      }}
      className={cardTouchLockClassName}
      {...attributes}
      {...holdListeners}
      onClick={onSelect}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`${game.title} — rank ${rank}. Tap for options, hold to move.`}
      aria-pressed={selected}
    >
      <SocialGamerCardImageFrame
        game={game}
        rank={rank}
        width={width}
        height={height}
        rankScaleWidth={rankScaleWidth}
        rankChrome={rankChrome}
      />
    </div>
  );
}

function EmptySlot({
  rank,
  width,
  height,
  bannerH,
  showRank = true,
  onClick,
}: {
  rank: number;
  width: number;
  height: number;
  bannerH: number;
  showRank?: boolean;
  onClick?: () => void;
}) {
  const radius = cardOuterRadius(width);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width,
        height: height + bannerH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: radius,
        overflow: "hidden",
        border: "3px dashed rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.02)",
        cursor: onClick ? "pointer" : "default",
        boxSizing: "border-box",
      }}
      aria-label={`Empty slot ${rank} — add a game`}
    >
      <div
        style={{
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: Math.round(width * 0.06),
          color: "rgba(255,255,255,0.28)",
          fontSize: Math.round(width * 0.28),
          fontWeight: 300,
          lineHeight: 1,
        }}
      >
        +
      </div>
      {showRank && bannerH > 0 ? (
        <div
          style={{
            height: bannerH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,90,31,0.14)",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "Arial, sans-serif",
            fontWeight: 800,
            fontSize: Math.max(12, Math.round(width * 0.12)),
            letterSpacing: "0.02em",
          }}
        >
          {formatExportRank(rank, "ordinal")}
        </div>
      ) : null}
    </button>
  );
}
