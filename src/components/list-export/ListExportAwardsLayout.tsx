import {
  exportRankBannerBelowHeight,
  SocialGamerCardImageFrame,
} from "./SocialGamerCardImageFrame";
import type { ExportGame, ListExportPosterProps } from "./listExportTypes";
import {
  BRAND_ORANGE,
  DEFAULT_GOTY_POSTER_TITLE,
  POSTER_MADE_WITH_BRAND,
} from "./listExportTypes";
import {
  AWARDS_BRAND_SIZE,
  AWARDS_GRID_GAP,
  AWARDS_GRID_TOP_PAD,
  AWARDS_HEADER_BAND_PX,
  AWARDS_HEADER_LINE_Y,
  AWARDS_SIDE_PAD,
  AWARDS_TITLE_LINE_GAP,
  AWARDS_TITLE_SIZE,
  awardsSizesForLayout,
  buildAwardsRows,
  type CardSize,
} from "./exportAwardsGrid";
import { PRODUCTION_EXPORT_RANK_CHROME } from "./rankChrome";

export const AWARDS_BG = "#0c0c0e";
export const AWARDS_FOOTER_PX = 32;
const AWARDS_FOOTER_LINE_FROM_BOTTOM_PX = 22;
const displayFont = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const bodyFont = "ui-sans-serif, system-ui, sans-serif";

/** Y position of the header glow line — derived purely from layout constants. */
export function awardsHeaderLineY(): number {
  const textStackH = AWARDS_TITLE_SIZE + AWARDS_TITLE_LINE_GAP + AWARDS_BRAND_SIZE;
  const textBottomY = (AWARDS_HEADER_BAND_PX + textStackH) / 2;
  const gamesTopY = AWARDS_HEADER_BAND_PX + AWARDS_GRID_TOP_PAD;
  return (textBottomY + gamesTopY) / 2;
}

let titleMeasureCtx: CanvasRenderingContext2D | null = null;

function getTitleMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!titleMeasureCtx) {
    const canvas = document.createElement("canvas");
    titleMeasureCtx = canvas.getContext("2d");
  }
  return titleMeasureCtx;
}

function measureExportTitleWidth(
  text: string,
  fontSize: number,
  trackingEm: number,
): number {
  const ctx = getTitleMeasureCtx();
  if (!ctx) {
    return text.length * fontSize * (0.62 + trackingEm);
  }
  ctx.font = `900 ${fontSize}px ${displayFont}`;
  const base = ctx.measureText(text).width;
  return base + trackingEm * fontSize * Math.max(0, text.length - 1);
}

function fitExportTitleSingleLine(
  rawTitle: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  trackingEm: number,
): { text: string; size: number } {
  const title = rawTitle.trim().toUpperCase() || "MY LIST";
  const floor = Math.min(preferredSize, Math.max(18, minSize));
  let size = preferredSize;

  while (size > floor && measureExportTitleWidth(title, size, trackingEm) > maxWidth) {
    size -= 1;
  }

  if (measureExportTitleWidth(title, size, trackingEm) <= maxWidth) {
    return { text: title, size };
  }

  let truncated = title;
  while (
    truncated.length > 1 &&
    measureExportTitleWidth(`${truncated}…`, size, trackingEm) > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd();
  }

  if (truncated.length < title.length) {
    return { text: `${truncated}…`, size };
  }
  return { text: title, size };
}

export function AwardsPosterBackground({
  width,
  height,
  headerLineY = AWARDS_HEADER_LINE_Y,
}: {
  width: number;
  height: number;
  headerLineY?: number;
}) {
  const dotStep = Math.round(width * 0.02);
  const footerLineY = height - AWARDS_FOOTER_LINE_FROM_BOTTOM_PX;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: AWARDS_BG,
      }}
      aria-hidden
    >
      {(
        [
          { left: 0, top: 0 },
          { right: 0, top: 0 },
        ] as const
      ).map((corner, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...("left" in corner ? { left: corner.left } : { right: corner.right }),
            top: corner.top,
            width: "48%",
            height: "36%",
            overflow: "hidden",
            opacity: 0.4,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage:
                "radial-gradient(circle, rgba(255,90,31,0.35) 1px, transparent 1px)",
              backgroundSize: `${dotStep}px ${dotStep}px`,
            }}
          />
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: Math.round(height * 0.28),
          background:
            "radial-gradient(ellipse 70% 90% at 50% -10%, rgba(255,90,31,0.22) 0%, rgba(255,90,31,0.06) 42%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.round(height * 0.2),
          background:
            "radial-gradient(ellipse 60% 80% at 50% 110%, rgba(255,90,31,0.16) 0%, transparent 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "5%",
          right: "5%",
          top: headerLineY - 1,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, rgba(255,90,31,0.15) 15%, ${BRAND_ORANGE} 50%, rgba(255,90,31,0.15) 85%, transparent 100%)`,
          boxShadow: "0 0 18px rgba(255,90,31,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: footerLineY,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(255,90,31,0.45), transparent)`,
          boxShadow: "0 0 10px rgba(255,90,31,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 95% 88% at 50% 48%, transparent 52%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

function AwardsYearBox({ year, size }: { year: number; size: number }) {
  const yearStr = String(year);
  const top = yearStr.slice(0, 2);
  const bottom = yearStr.slice(2);
  const fontSize = Math.round(size * 0.38);
  const stroke = Math.max(2, Math.round(size * 0.028));

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(size * 0.04),
        position: "relative",
        zIndex: 2,
        backgroundColor: AWARDS_BG,
        border: `${stroke}px solid ${BRAND_ORANGE}`,
        boxSizing: "border-box",
        boxShadow: `0 0 20px rgba(255,90,31,0.15)`,
      }}
      aria-hidden
    >
      <span
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize,
          color: BRAND_ORANGE,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {top}
      </span>
      <span
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize,
          color: BRAND_ORANGE,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {bottom}
      </span>
    </div>
  );
}

function AwardsTopCountBox({ count, size }: { count: number; size: number }) {
  const labelSize = Math.round(size * 0.28);
  const numberSize = Math.round(size * (count >= 10 ? 0.36 : 0.42));
  const stroke = Math.max(2, Math.round(size * 0.028));

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(size * 0.02),
        position: "relative",
        zIndex: 2,
        backgroundColor: AWARDS_BG,
        border: `${stroke}px solid ${BRAND_ORANGE}`,
        boxSizing: "border-box",
        boxShadow: `0 0 20px rgba(255,90,31,0.15)`,
      }}
      aria-hidden
    >
      <span
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: labelSize,
          color: BRAND_ORANGE,
          lineHeight: 1,
          letterSpacing: "0.06em",
        }}
      >
        TOP
      </span>
      <span
        style={{
          fontFamily: displayFont,
          fontWeight: 900,
          fontSize: numberSize,
          color: BRAND_ORANGE,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function AwardsBrandLine({ size }: { size: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.max(8, Math.round(size * 0.4)),
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontFamily: bodyFont,
          fontSize: size,
          fontStyle: "italic",
          fontWeight: 500,
          color: "rgba(255,255,255,0.78)",
          lineHeight: 1,
        }}
      >
        made with
      </span>
      <span
        style={{
          fontFamily: bodyFont,
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "0.01em",
          color: "#fff",
          lineHeight: 1,
        }}
      >
        {POSTER_MADE_WITH_BRAND.replace(/\.gg$/, "")}
        <span style={{ color: BRAND_ORANGE }}>.gg</span>
      </span>
    </div>
  );
}

export function AwardsExportHeader({
  year,
  topCount,
  listType,
  heightPx,
  widthPx,
  title: titleProp,
  showYearBadge,
  showTopCount,
}: {
  year: number;
  topCount: number;
  listType: "goty" | "custom";
  heightPx: number;
  widthPx: number;
  title?: string;
  /** Defaults from listType when omitted (goty → year, custom → top). */
  showYearBadge?: boolean;
  showTopCount?: boolean;
}) {
  const badgeSize = Math.min(Math.round(heightPx * 0.78), 100);
  const preferredTitleSize = AWARDS_TITLE_SIZE;
  const brandSize = AWARDS_BRAND_SIZE;
  const titleGap = AWARDS_TITLE_LINE_GAP;
  const titleTrackingEm = listType === "custom" ? 0.06 : 0.08;
  const yearOn = showYearBadge ?? listType !== "custom";
  const topOn = showTopCount ?? listType === "custom";
  const badgeCount = (yearOn ? 1 : 0) + (topOn ? 1 : 0);
  const badgeGap = Math.round(badgeSize * 0.2);
  const badgesW =
    badgeCount > 0 ? badgeCount * badgeSize + (badgeCount - 1) * badgeGap : 0;
  const titleMaxW = Math.max(
    120,
    widthPx -
      AWARDS_SIDE_PAD * 2 -
      badgesW -
      (badgeCount > 0 ? badgeGap : 0),
  );
  const { text: title, size: titleSize } = fitExportTitleSingleLine(
    titleProp?.trim() || (listType === "custom" ? "MY LIST" : DEFAULT_GOTY_POSTER_TITLE),
    titleMaxW,
    preferredTitleSize,
    brandSize,
    titleTrackingEm,
  );

  return (
    <div
      style={{
        flexShrink: 0,
        height: heightPx,
        boxSizing: "border-box",
        padding: `0 ${AWARDS_SIDE_PAD}px`,
        fontFamily: bodyFont,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: badgeGap,
        position: "relative",
      }}
    >
      {yearOn ? <AwardsYearBox year={year} size={badgeSize} /> : null}
      {topOn ? <AwardsTopCountBox count={topCount} size={badgeSize} /> : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: titleGap,
          maxWidth: titleMaxW,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontFamily: displayFont,
            fontSize: titleSize,
            fontWeight: 900,
            letterSpacing: `${titleTrackingEm}em`,
            color: "#fff",
            lineHeight: 1,
            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
            maxWidth: titleMaxW,
            width: "100%",
          }}
        >
          {title}
        </div>
        <AwardsBrandLine size={brandSize} />
      </div>
    </div>
  );
}

export function AwardsExportFooter({
  heightPx,
  widthPx,
}: {
  heightPx: number;
  widthPx: number;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        height: heightPx,
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: `0 ${AWARDS_SIDE_PAD}px ${AWARDS_FOOTER_LINE_FROM_BOTTOM_PX - 8}px`,
        fontFamily: bodyFont,
      }}
      aria-hidden
    >
      <div
        style={{
          width: Math.round(widthPx * 0.84),
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(255,90,31,0.45), transparent)`,
          boxShadow: "0 0 10px rgba(255,90,31,0.25)",
        }}
      />
    </div>
  );
}

function AwardsPodiumRow({
  games,
  ranks,
  contentW,
  gap,
  cardSize,
  rankChrome,
  rankScaleWidth,
  renderCard,
  rowIndex,
  rowCount,
}: {
  games: ExportGame[];
  ranks: number[];
  contentW: number;
  gap: number;
  cardSize: CardSize;
  rankChrome?: ListExportPosterProps["rankChrome"];
  rankScaleWidth: number;
  renderCard?: ListExportPosterProps["renderCard"];
  rowIndex: number;
  rowCount: number;
}) {
  if (games.length === 0) return null;
  const { w, h } = cardSize;
  const chrome = rankChrome ?? PRODUCTION_EXPORT_RANK_CHROME;
  const rowH = h + exportRankBannerBelowHeight(rankScaleWidth, chrome);

  return (
    <div
      style={{
        flexShrink: 0,
        width: contentW,
        height: rowH,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          gap,
          height: rowH,
        }}
      >
        {games.map((game, i) => {
          const rank = ranks[i]!;
          if (!renderCard) {
            return (
              <SocialGamerCardImageFrame
                key={game.id}
                game={game}
                rank={rank}
                width={w}
                height={h}
                rankChrome={rankChrome}
                rankScaleWidth={rankScaleWidth}
              />
            );
          }
          const card = (
            <SocialGamerCardImageFrame
              game={game}
              rank={rank}
              width={w}
              height={h}
              rankChrome={rankChrome}
              rankScaleWidth={rankScaleWidth}
            />
          );
          return (
            <div key={game.id} style={{ display: "flex", flexShrink: 0 }}>
              {renderCard({
                rank,
                card,
                width: w,
                height: rowH,
                row: rowIndex,
                col: i,
                colsInRow: games.length,
                rowCount,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LayoutAwardsPodium({
  games,
  canvasWidth,
  canvasHeight,
  headerHeightPx,
  footerHeightPx,
  gridTopPad = AWARDS_GRID_TOP_PAD,
  rankChrome,
  renderCard,
}: {
  games: ExportGame[];
  canvasWidth: number;
  canvasHeight: number;
  headerHeightPx: number;
  footerHeightPx: number;
  gridTopPad?: number;
  rankChrome?: ListExportPosterProps["rankChrome"];
  renderCard?: ListExportPosterProps["renderCard"];
}) {
  const rows = buildAwardsRows(games);
  const contentW = canvasWidth - AWARDS_SIDE_PAD * 2;
  const contentH = canvasHeight - headerHeightPx - footerHeightPx - gridTopPad;
  const chrome = rankChrome ?? PRODUCTION_EXPORT_RANK_CHROME;

  const { cardByRow: sizedRows } = awardsSizesForLayout(
    contentW,
    contentH,
    rows,
    AWARDS_GRID_GAP,
    (cardW) => exportRankBannerBelowHeight(cardW, chrome),
  );
  const rankScaleWidth = Math.max(1, ...sizedRows.map((card) => card.w));
  const { cardByRow } = awardsSizesForLayout(
    contentW,
    contentH,
    rows,
    AWARDS_GRID_GAP,
    () => exportRankBannerBelowHeight(rankScaleWidth, chrome),
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: AWARDS_GRID_GAP,
        padding: `${gridTopPad}px ${AWARDS_SIDE_PAD}px 0`,
        boxSizing: "border-box",
      }}
    >
      {rows.map((row, i) => (
        <AwardsPodiumRow
          key={row.ranks.join("-")}
          games={row.games}
          ranks={row.ranks}
          contentW={contentW}
          gap={AWARDS_GRID_GAP}
          cardSize={cardByRow[i]!}
          rankChrome={rankChrome}
          rankScaleWidth={rankScaleWidth}
          renderCard={renderCard}
          rowIndex={i}
          rowCount={rows.length}
        />
      ))}
    </div>
  );
}

export function ListExportAwardsPoster({
  games,
  year,
  width,
  height,
  gameCount,
  listType = "goty",
  title,
  showYearBadge,
  showTopCount,
  rankChrome,
  renderCard,
  backgroundSlot,
}: ListExportPosterProps) {
  const visible = games.slice(0, gameCount);
  const headerHeightPx = AWARDS_HEADER_BAND_PX;
  const gridTopPad = AWARDS_GRID_TOP_PAD;

  const titleSize = AWARDS_TITLE_SIZE;
  const brandSize = AWARDS_BRAND_SIZE;
  const lineGap = AWARDS_TITLE_LINE_GAP;
  const textStackH = titleSize + lineGap + brandSize;
  const textBottomY = (headerHeightPx + textStackH) / 2;
  const gamesTopY = headerHeightPx + gridTopPad;
  const headerLineY = (textBottomY + gamesTopY) / 2;

  const footerHeightPx = AWARDS_FOOTER_PX;
  const chrome = rankChrome ?? PRODUCTION_EXPORT_RANK_CHROME;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        backgroundColor: AWARDS_BG,
        display: "flex",
        flexDirection: "column",
        fontFamily: bodyFont,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {backgroundSlot ?? (
        <AwardsPosterBackground width={width} height={height} headerLineY={headerLineY} />
      )}
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
          topCount={visible.length}
          listType={listType}
          heightPx={headerHeightPx}
          widthPx={width}
          title={title}
          showYearBadge={showYearBadge}
          showTopCount={showTopCount}
        />
        <LayoutAwardsPodium
          games={visible}
          canvasWidth={width}
          canvasHeight={height}
          headerHeightPx={headerHeightPx}
          footerHeightPx={footerHeightPx}
          gridTopPad={gridTopPad}
          rankChrome={chrome}
          renderCard={renderCard}
        />
        <AwardsExportFooter heightPx={footerHeightPx} widthPx={width} />
      </div>
    </div>
  );
}

/** Primary export poster entry. */
export function ListExportPoster(props: ListExportPosterProps) {
  return <ListExportAwardsPoster {...props} />;
}
