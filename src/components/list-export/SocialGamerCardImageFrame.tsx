import type { CSSProperties } from "react";
import {
  formatExportRank,
  PRODUCTION_EXPORT_RANK_CHROME,
  type ExportRankChromeConfig,
} from "./rankChrome";
import { ExportCoverImage } from "./ExportCoverImage";
import { exportCoverUrl } from "./exportCoverUrl";
import type { ExportGame } from "./listExportTypes";
import { BRAND_ORANGE } from "./exportConstants";
import { socialGamerCardHeight } from "./socialGamerCardStyles";
import {
  scaleCardPx,
  themeForRank,
  coverClipBoxStyle,
  cardOuterRadius,
} from "./socialGamerCardTheme";

const rankFont = "Arial, sans-serif";
const RANK_BRAND_COLOR = BRAND_ORANGE;
const RANK_BRAND_FG = "#ffffff";

function chromeBgMix(color: string, alphaPct: number): CSSProperties {
  const a = Math.max(0, Math.min(100, Math.round(alphaPct)));
  if (a <= 0) return { backgroundColor: "transparent" };
  if (a >= 100) return { backgroundColor: color };
  return { backgroundColor: `color-mix(in srgb, ${color} ${a}%, transparent)` };
}

/** Extra height the under-cover banner adds below the cover (cover itself is not cropped). */
export function exportRankBannerBelowHeight(
  width: number,
  rankChrome: ExportRankChromeConfig = PRODUCTION_EXPORT_RANK_CHROME,
): number {
  if (rankChrome.mode !== "banner-below") return 0;
  const rankFontSize = scaleCardPx(width, 52);
  const bannerTextScale = Math.max(50, Math.min(160, rankChrome.bannerTextScale)) / 100;
  const bannerFontBase = Math.max(12, Math.round(rankFontSize * 0.45));
  const bannerFontSize = Math.max(10, Math.round(bannerFontBase * bannerTextScale));
  return Math.max(
    scaleCardPx(width, 28),
    bannerFontSize + Math.max(8, Math.round(width * 0.04)),
  );
}

function cardEdgeOverlay(
  width: number,
  rankChrome: ExportRankChromeConfig,
): React.ReactNode {
  const showInner = rankChrome.innerBorder && rankChrome.innerBorderAlpha > 0;
  if (!showInner) return null;

  const borderW = Math.max(
    1,
    scaleCardPx(width, Math.max(1, Math.min(8, rankChrome.innerBorderWidth))),
  );
  const alpha = Math.max(0, Math.min(100, rankChrome.innerBorderAlpha)) / 100;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6,
        borderRadius: cardOuterRadius(width),
        boxShadow: `inset 0 0 0 ${borderW}px rgba(186, 190, 202, ${alpha})`,
        pointerEvents: "none",
      }}
    />
  );
}

function cardOuterLiftShadow(width: number, enabled: boolean): string | undefined {
  if (!enabled) return undefined;
  const y = scaleCardPx(width, 7);
  const blur = scaleCardPx(width, 18);
  return `0 ${y}px ${blur}px rgba(0, 0, 0, 0.42)`;
}

export interface SocialGamerCardImageFrameProps {
  game: ExportGame;
  rank: number;
  width: number;
  height?: number;
  rankChrome?: ExportRankChromeConfig;
  /**
   * When set, rank text (and under-cover banner height) scale from this width so
   * every card on a poster shares the same type size.
   */
  rankScaleWidth?: number;
  style?: CSSProperties;
  className?: string;
}

/** Awards card — cover art + configurable rank chrome (production: under-cover banner). */
export function SocialGamerCardImageFrame({
  game,
  rank,
  width,
  height,
  rankChrome = PRODUCTION_EXPORT_RANK_CHROME,
  rankScaleWidth,
  style,
  className,
}: SocialGamerCardImageFrameProps) {
  const cardHeight = height ?? socialGamerCardHeight(width);
  const colors = themeForRank(rank);
  const padX = Math.max(8, Math.round(width * 0.05));
  const typeScaleW = rankScaleWidth ?? width;
  const rankFontSize = scaleCardPx(typeScaleW, 52);
  const mode = rankChrome.mode;
  const isBannerBelow = mode === "banner-below";
  const rankLabel = formatExportRank(rank, rankChrome.format);
  const blurredBackdrop = isBannerBelow && rankChrome.blurredBackdrop;
  const backdropBlurPx = Math.max(0, Math.min(24, rankChrome.blurredBackdropBlur));
  const bannerBrandBg = isBannerBelow && rankChrome.bannerBrandBg;
  const bannerBgAlpha = Math.max(0, Math.min(100, rankChrome.bannerBgAlpha));
  const bannerTextScale = Math.max(50, Math.min(160, rankChrome.bannerTextScale)) / 100;
  const bannerFontBase = Math.max(12, Math.round(rankFontSize * 0.45));
  const bannerFontSize = Math.max(10, Math.round(bannerFontBase * bannerTextScale));
  const bannerH = exportRankBannerBelowHeight(typeScaleW, rankChrome);
  const coverH = cardHeight;
  const totalH = cardHeight + bannerH;
  const bannerBgStyle: CSSProperties = bannerBrandBg
    ? chromeBgMix(RANK_BRAND_COLOR, bannerBgAlpha)
    : chromeBgMix("#000000", bannerBgAlpha);
  const outerLiftShadow = cardOuterLiftShadow(width, rankChrome.outerLift);

  const digitStyle: CSSProperties = {
    fontSize: bannerFontSize,
    fontWeight: 800,
    lineHeight: 1,
    fontFamily: rankFont,
    letterSpacing: "0.02em",
    color: bannerBrandBg ? RANK_BRAND_FG : colors.accent,
    textShadow: bannerBrandBg
      ? "0 1px 2px rgba(0,0,0,0.35)"
      : "0 2px 4px rgba(0,0,0,0.55)",
  };

  const coverUrl = exportCoverUrl(game.imageUrl ?? "");

  const coverImage = (
    <ExportCoverImage
      src={coverUrl}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        display: "block",
      }}
    />
  );

  if (mode === "none") {
    return (
      <div
        data-awards-image-card=""
        className={className}
        style={{
          position: "relative",
          width,
          height: cardHeight,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "#000",
          borderRadius: cardOuterRadius(width),
          boxSizing: "border-box",
          boxShadow: outerLiftShadow,
          ...style,
        }}
      >
        {coverImage}
        {cardEdgeOverlay(width, rankChrome)}
      </div>
    );
  }

  if (mode === "corner-chip") {
    const chipFontSize = Math.max(11, bannerFontSize);
    const chipPadX = Math.max(6, Math.round(chipFontSize * 0.55));
    const chipPadY = Math.max(3, Math.round(chipFontSize * 0.3));
    const chipMargin = Math.max(6, Math.round(width * 0.045));
    const chipRadius = Math.max(6, Math.round(chipFontSize * 0.55));
    const chipBlurPx = Math.max(0, Math.min(24, rankChrome.blurredBackdropBlur));
    const chipBg = bannerBrandBg
      ? chromeBgMix(RANK_BRAND_COLOR, bannerBgAlpha)
      : chromeBgMix("#000000", bannerBgAlpha);
    const chipBackdrop: CSSProperties =
      chipBlurPx > 0
        ? {
            backdropFilter: `blur(${chipBlurPx}px)`,
            WebkitBackdropFilter: `blur(${chipBlurPx}px)`,
          }
        : {};

    return (
      <div
        data-awards-image-card=""
        className={className}
        style={{
          position: "relative",
          width,
          height: cardHeight,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "#000",
          borderRadius: cardOuterRadius(width),
          boxSizing: "border-box",
          boxShadow: outerLiftShadow,
          ...style,
        }}
      >
        {coverImage}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: chipMargin,
            bottom: chipMargin,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${chipPadY}px ${chipPadX}px`,
            borderRadius: chipRadius,
            // Clip the blurred backdrop to the chip's rounded rect. Applying the
            // backdrop-filter and border-radius on the same node lets the blur
            // bleed past the corners (visible when the poster is rasterized), so
            // the fill/blur live on an inner layer that this container clips.
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              ...chipBg,
              ...chipBackdrop,
            }}
          />
          <span
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: chipFontSize,
              fontWeight: 800,
              lineHeight: 1,
              fontFamily: rankFont,
              letterSpacing: "0.02em",
              color: bannerBrandBg ? RANK_BRAND_FG : "#ffffff",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {rankLabel}
          </span>
        </div>
        {cardEdgeOverlay(width, rankChrome)}
      </div>
    );
  }

  if (isBannerBelow) {
    return (
      <div
        data-awards-image-card=""
        className={className}
        style={{
          position: "relative",
          width,
          height: totalH,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "#000",
          borderRadius: cardOuterRadius(width),
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          boxShadow: outerLiftShadow,
          ...style,
        }}
      >
        {blurredBackdrop ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <ExportCoverImage
              src={coverUrl}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                height: "100%",
                width: "auto",
                maxWidth: "none",
                transform: "translateX(-50%)",
                filter: `blur(${backdropBlurPx}px)`,
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: coverH,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {coverImage}
        </div>

        <div
          aria-hidden
          style={{
            position: "relative",
            zIndex: 1,
            height: bannerH,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `0 ${padX}px`,
            ...bannerBgStyle,
            pointerEvents: "none",
          }}
        >
          <span style={digitStyle}>{rankLabel}</span>
        </div>

        {cardEdgeOverlay(width, rankChrome)}
      </div>
    );
  }

  return (
    <div
      data-awards-image-card=""
      className={className}
      style={{
        position: "relative",
        width,
        height: cardHeight,
        flexShrink: 0,
        overflow: "hidden",
        backgroundColor: "#000",
        borderRadius: cardOuterRadius(width),
        boxSizing: "border-box",
        boxShadow: outerLiftShadow,
        ...style,
      }}
    >
      <div style={coverClipBoxStyle(width)}>{coverImage}</div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${Math.max(4, Math.round(width * 0.02))}px ${padX}px`,
          background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35))",
          pointerEvents: "none",
        }}
      >
        <span style={{ ...digitStyle, fontSize: rankFontSize }}>{rankLabel}</span>
      </div>

      {cardEdgeOverlay(width, rankChrome)}
    </div>
  );
}
