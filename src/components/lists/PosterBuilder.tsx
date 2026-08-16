"use client";

import {
  DndContext,
  DragOverlay,
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

  // Map each rank (1-based) to canvas card dimensions for the drag overlay.
  const rankSize = useMemo(() => {
    const m = new Map<number, { w: number; h: number }>();
    rows.forEach((row, rowIndex) => {
      const { w, h } = cardByRow[rowIndex]!;
      row.ranks.forEach((rank) => m.set(rank, { w, h }));
    });
    return m;
  }, [rows, cardByRow]);

  /**
   * Interactive poster is laid out in **on-screen pixels** (canvas × scale).
   * Do not CSS-`scale()` the DnD tree — that breaks pointer tracking (Grid
   * works because it has no transform wrapper).
   */
  const sx = (n: number) => n * scale;
  const viewW = sx(CANVAS_W);
  const viewH = sx(CANVAS_H);
  const viewGap = sx(AWARDS_GRID_GAP);
  const viewSidePad = sx(AWARDS_SIDE_PAD);
  const viewGridTopPad = sx(AWARDS_GRID_TOP_PAD);
  const viewHeaderH = sx(AWARDS_HEADER_BAND_PX);
  const viewFooterH = sx(AWARDS_FOOTER_PX);
  const viewBannerH = sx(bannerH);
  const viewRankScaleW = sx(rankScaleWidth);

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

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;
  const activeRank = activeId ? filledIds.indexOf(activeId) + 1 : 0;
  const activeSize = activeRank > 0 ? rankSize.get(activeRank) : undefined;

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
        <div
          style={{
            position: "relative",
            width: "100%",
            height: viewH,
            overflow: "hidden",
          }}
        >
          <AwardsPosterBackground
            width={viewW}
            height={viewH}
            headerLineY={sx(awardsHeaderLineY())}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              width: viewW,
              height: viewH,
              minHeight: 0,
            }}
          >
            <AwardsExportHeader
              year={year}
              topCount={slotCount}
              listType={listType}
              heightPx={viewHeaderH}
              widthPx={viewW}
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
                  gap: viewGap,
                  padding: `${viewGridTopPad}px ${viewSidePad}px 0`,
                  boxSizing: "border-box",
                }}
              >
                {rows.map((row, rowIndex) => {
                  const { w, h } = cardByRow[rowIndex]!;
                  const cardW = sx(w);
                  const cardH = sx(h);
                  const rowH = cardH + viewBannerH;
                  return (
                    <div
                      key={row.ranks.join("-")}
                      style={{
                        width: viewW - viewSidePad * 2,
                        height: rowH,
                        display: "flex",
                        alignItems: "stretch",
                        justifyContent: "center",
                        gap: viewGap,
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
                              width={cardW}
                              height={cardH}
                              rankScaleWidth={viewRankScaleW}
                              rankChrome={chrome}
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
                            width={cardW}
                            height={cardH}
                            bannerH={viewBannerH}
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

            <AwardsExportFooter heightPx={viewFooterH} widthPx={viewW} />
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
              {debugStats.largest.w}×{debugStats.largest.h}px ·{" "}
              {debugStats.largest.widthPct}% width · {debugStats.largest.areaPct}
              % area
            </div>
            <div>
              <span className="text-[var(--ink)]">smallest</span>{" "}
              {debugStats.smallest.w}×{debugStats.smallest.h}px ·{" "}
              {debugStats.smallest.widthPct}% width ·{" "}
              {debugStats.smallest.areaPct}% area
            </div>
            <div>
              size parity (small/large){" "}
              <span className="text-[var(--ink)]">{debugStats.parityPct}%</span>{" "}
              · area used{" "}
              <span className="text-[var(--ink)]">{debugStats.coveragePct}%</span>
            </div>
          </div>
        ) : null}

        <DragOverlay dropAnimation={null}>
          {activeItem && activeSize ? (
            <div
              style={{
                width: sx(activeSize.w),
                cursor: "grabbing",
              }}
            >
              <SocialGamerCardImageFrame
                game={{
                  id: activeItem.id,
                  title: activeItem.title,
                  imageUrl: activeItem.coverUrl,
                }}
                rank={activeRank}
                width={sx(activeSize.w)}
                height={sx(activeSize.h)}
                rankScaleWidth={viewRankScaleW}
                rankChrome={chrome}
                style={{
                  boxShadow:
                    "0 0 0 6px rgba(255,90,31,0.9), 0 24px 60px rgba(0,0,0,0.7)",
                }}
              />
            </div>
          ) : null}
        </DragOverlay>
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
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const holdListeners = mergeHoldDragListeners(listeners);

  return (
    <div
      ref={setNodeRef}
      data-list-card={id}
      style={{
        position: "relative",
        width,
        flexShrink: 0,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        outline: selected ? "3px solid var(--accent)" : undefined,
        outlineOffset: 4,
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
        borderRadius: radius,
        border: "2px dashed rgba(244,240,232,0.22)",
        background: "rgba(255,255,255,0.03)",
        color: "rgba(244,240,232,0.45)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.max(4, Math.round(width * 0.04)),
        padding: Math.max(6, Math.round(width * 0.06)),
      }}
      aria-label={
        onClick ? `Empty slot ${rank}, add a game` : `Empty slot ${rank}`
      }
    >
      {showRank ? (
        <span
          style={{
            fontFamily: "Bebas Neue, Impact, sans-serif",
            fontSize: Math.max(16, Math.round(width * 0.22)),
            letterSpacing: "0.04em",
            lineHeight: 1,
            color: "rgba(255,90,31,0.55)",
          }}
        >
          {formatExportRank(rank, "ordinal")}
        </span>
      ) : null}
      <span
        style={{
          fontSize: Math.max(10, Math.round(width * 0.08)),
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Empty
      </span>
    </button>
  );
}
