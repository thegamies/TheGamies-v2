import type { ReactNode } from "react";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import { PODIUM_COVER } from "@/components/communities/coverSizes";
import {
  DEFAULT_RANK_SCORE_LAYOUT,
  standingCardChrome,
  type RankScoreLayout,
} from "@/components/communities/standingCardLayout";

export function standingGameHref(
  slug: string | null | undefined,
): string | null {
  const trimmed = slug?.trim();
  return trimmed ? `/games/${trimmed}` : null;
}

function OptionalGameLink({
  slug,
  className,
  children,
}: {
  slug: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const href = standingGameHref(slug);
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a href={href} className={className} draggable={false}>
      {children}
    </a>
  );
}

export type { RankScoreLayout };

const TITLE_SIZES = [14, 16, 18, 20, 28] as const;

function titleSize(maxPx: number): number {
  return (TITLE_SIZES as readonly number[]).includes(maxPx) ? maxPx : 18;
}

function captionClass(offset: string, lgAlign: boolean): string {
  const mt =
    offset === "mt-1"
      ? "standing-caption--mt1"
      : offset === "mt-0.5"
        ? "standing-caption--mt05"
        : "standing-caption--mt2";
  const align = lgAlign ? "standing-caption--lg" : "standing-caption--base";
  return `standing-caption ${mt} ${align}`;
}

function placeMarkerClass(
  placeSize: "md" | "lg",
  size: "md" | "sm",
  place: number | null,
): string {
  if (placeSize === "lg") {
    return place != null && place <= 3
      ? "standing-place standing-place--top"
      : "standing-place standing-place--rest";
  }
  if (size === "sm") return "standing-place standing-place--sm";
  return "standing-place standing-place--md";
}

function scoreRowClass(rowGapClass: string): string {
  const gap =
    rowGapClass === "mb-2"
      ? " standing-score-row--mb2"
      : rowGapClass === "mb-0.5"
        ? " standing-score-row--mb05"
        : rowGapClass === "mt-0.5"
          ? " standing-score-row--mt05"
          : "";
  return `standing-score-row${gap}`;
}

/** Comparison strip cell: column width plus the rank-row or award-row padding. */
export const standingCmpCellRankClass =
  "standing-cmp-cell standing-cmp-cell--rank";
export const standingCmpCellAwardClass =
  "standing-cmp-cell standing-cmp-cell--award";

export function StandingCoverArt({
  title,
  coverUrl,
  priority = false,
  fill = false,
  fallback = "card",
}: {
  title: string;
  coverUrl: string | null;
  priority?: boolean;
  /** Fill a parent that already has the 3:4 box (tie stack). */
  fill?: boolean;
  fallback?: "card" | "tie";
}) {
  const frame = fill ? "standing-cover standing-cover--fill" : "standing-cover";
  return (
    <div className={frame}>
      {coverUrl ? (
        // Native img: one URL, no Next/Image fill style on every card.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={title}
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
        />
      ) : fallback === "tie" ? (
        <div className="standing-tie-fallback">
          <p>{title}</p>
        </div>
      ) : (
        <div className="standing-cover-fallback">
          <p>{title}</p>
        </div>
      )}
    </div>
  );
}

export type StandingGameCardProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  /** Shown in front of the title — never as a cover overlay. */
  place?: number | null;
  year?: number | null;
  points?: number | null;
  /** Defaults to "pts"; use "votes" for category tallies. */
  scoreUnit?: "pts" | "votes";
  priority?: boolean;
  /**
   * `md` — games-browse / Top 10 grid (full-width cover).
   * `sm` — Comparison / strip cards (`MATRIX_COVER`; `MATRIX_COVER_WIDE` from `lg`).
   */
  size?: "md" | "sm";
  /**
   * Place marker scale when `place` is set.
   * `md` — standings default (~18px). `lg` — Ranked Results (display).
   */
  placeSize?: "md" | "lg";
  /**
   * Where rank + score sit when `points` is set. Product default is
   * `votes-under-title`. Other values stay on `/design-system`.
   */
  rankScoreLayout?: RankScoreLayout;
  /**
   * Pin the cover to a shared baseline in a 2-row subgrid strip so a taller
   * caption (wrapped title) cannot lift the art. Parent `li` must use
   * `standingStripColClass`.
   */
  pinCover?: boolean;
  /** Defaults to the game page. Category highlights may point at a year board. */
  href?: string;
};

/**
 * Same card language as games browse: GameCover + title (+ optional meta).
 * When scores are hidden, rank (if any) sits in front of the title — never on
 * the cover. When `points` is set, rank stays in front of the title and the
 * score hugs the last title line (no reserved 2-line block). Comparison strips
 * omit place (column headers name the source). Titles clamp to 2 lines and
 * shrink toward a 12px floor; score layouts reserve 2-line height except
 * `votes-under-title`.
 */
export function StandingGameCard({
  slug,
  title,
  coverUrl,
  place = null,
  year,
  points,
  scoreUnit = "pts",
  priority = false,
  size = "md",
  placeSize = "md",
  rankScoreLayout = DEFAULT_RANK_SCORE_LAYOUT,
  pinCover = false,
  href,
}: StandingGameCardProps) {
  const chrome = standingCardChrome(rankScoreLayout, points != null);
  const scoreLabel =
    points != null
      ? `${points} ${scoreUnit === "votes" ? (points === 1 ? "vote" : "votes") : "pts"}`
      : null;
  const meta =
    chrome.votesUnderTitle
      ? [scoreLabel, year != null ? String(year) : null]
          .filter(Boolean)
          .join(" · ") || null
      : chrome.placeBeforeTitle
        ? scoreLabel && year != null
          ? `${scoreLabel} · ${year}`
          : (scoreLabel ?? (year != null ? String(year) : null))
        : year != null
          ? String(year)
          : null;

  const placeClass = placeMarkerClass(placeSize, size, place);

  const rankScoreRow =
    chrome.row && (place != null || scoreLabel) ? (
      <div className={scoreRowClass(chrome.rowGapClass)}>
        {place != null ? (
          <span className={placeClass} aria-label={`Rank ${place}`}>
            {place}
          </span>
        ) : (
          <span />
        )}
        {scoreLabel ? (
          <span
            className={`standing-score ${
              chrome.tightRow ? "standing-score--tight" : "standing-score--pad"
            }`}
          >
            {scoreLabel}
          </span>
        ) : null}
      </div>
    ) : null;

  const titleBlock = (
    <div
      className={captionClass(
        chrome.titleOffsetClass,
        chrome.placeBeforeTitle && placeSize === "lg",
      )}
    >
      {chrome.placeBeforeTitle && place != null ? (
        <span className={placeClass} aria-label={`Rank ${place}`}>
          {place}
        </span>
      ) : null}
      <div
        className={
          chrome.placeBeforeTitle && placeSize === "lg"
            ? "standing-copy standing-copy--lg"
            : "standing-copy"
        }
      >
        <StandingCardTitle
          title={title}
          maxPx={
            placeSize === "lg" ? (place != null && place <= 3 ? 20 : 16) : 18
          }
          reserve={chrome.reserveTitle}
        />
        {meta ? (
          <p
            className={
              chrome.votesUnderTitle
                ? "standing-meta standing-meta--votes"
                : "standing-meta standing-meta--gap"
            }
          >
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  );

  const cover = (
    <StandingCoverArt title={title} coverUrl={coverUrl} priority={priority} />
  );

  const pinnedCover = pinCover ? (
    <div className="standing-pin">{cover}</div>
  ) : (
    cover
  );

  const body = (
    <>
      {chrome.row === "above" ? rankScoreRow : null}
      {pinnedCover}
      {chrome.row === "below" ? rankScoreRow : null}
      {titleBlock}
    </>
  );

  const linkClass = pinCover
    ? "standing-card standing-card--pin"
    : size === "sm"
      ? "standing-card standing-card--sm"
      : "standing-card";

  const to = href ?? standingGameHref(slug);
  if (!to) {
    return <div className={linkClass}>{body}</div>;
  }
  return (
    <a href={to} className={linkClass} draggable={false}>
      {body}
    </a>
  );
}

/** Two-line title. Shared classes so a grid of cards does not repeat the utility list. */
export function StandingCardTitle({
  title,
  maxPx,
  reserve = true,
}: {
  title: string;
  maxPx: number;
  reserve?: boolean;
}) {
  const px = titleSize(maxPx);
  return (
    <span
      className={
        reserve
          ? `standing-title-slot standing-title-slot--${px}`
          : "standing-title-slot"
      }
    >
      <p title={title} className={`standing-title standing-title--${px}`}>
        {title}
      </p>
    </span>
  );
}

/** Same footprint as `StandingGameCard` sm — empty cover + reserved 2-line caption. */
export function EmptyStandingCard({
  label = "No pick",
}: {
  label?: string;
}) {
  return (
    <div className="standing-w-sm" aria-label={label}>
      <div className="standing-cover" aria-hidden />
      <p className="standing-empty-label">{label}</p>
    </div>
  );
}

export function StandingGameCardGrid({
  children,
  density = "default",
}: {
  children: React.ReactNode;
  /** `tight` — live standings boards (same row/column gap, slightly denser). */
  density?: "default" | "tight";
}) {
  return (
    <ul
      className={
        density === "tight"
          ? "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          : "mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      }
    >
      {children}
    </ul>
  );
}

/** Horizontal rank strip: cover row + caption row so art shares a bottom edge. */
export const standingStripListClass =
  "grid w-max grid-flow-col grid-rows-[auto_auto] justify-start gap-x-4";

export function standingStripColClass(featured: boolean): string {
  return `group row-span-2 grid grid-rows-subgrid ${
    featured
      ? "w-[168px] shrink-0 sm:w-[190px]"
      : "w-[132px] shrink-0 sm:w-[148px]"
  }`;
}

/**
 * Fill-row standing cards. Column width is min(editorial 5-up at `--page-max`,
 * `--standing-fill-min-visible` across the row). Extra items stay on one row
 * and scroll. A decimal visible count peeks the next cover.
 */
export const standingFillFiveListClass =
  "grid w-max min-w-full grid-flow-col grid-rows-[auto_auto] justify-start gap-x-[var(--standing-fill-gap)] overflow-y-hidden [grid-auto-columns:var(--standing-fill-card)]";

export const standingFillFiveFlowClass =
  "grid w-max min-w-full grid-flow-col items-start justify-start gap-x-[var(--standing-fill-gap)] overflow-y-hidden [grid-auto-columns:var(--standing-fill-card)]";

export function standingFillFiveColClass(): string {
  return "group min-w-0 row-span-2 grid grid-rows-subgrid";
}

export type WinnerPodiumEntry = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  /** Optional caption under the title (omit on Results Ranked). */
  meta?: string;
};

/** #2/#3 relative to rank-1 — desktop max matches ~72% of podium art. */
const RUNNER_MAX = {
  width: Math.round(PODIUM_COVER.width * 0.72),
  height: Math.round(PODIUM_COVER.height * 0.72),
} as const;

function podiumColClass(size: "winner" | "runner"): string {
  return size === "winner"
    ? "w-[168px] shrink-0 sm:w-[190px] md:w-[206px]"
    : "w-[118px] shrink-0 sm:w-[132px] md:w-[148px]";
}

function PodiumCoverStack({
  entry,
  size,
}: {
  entry: WinnerPodiumEntry;
  size: "winner" | "runner";
}) {
  const isWinner = size === "winner";
  return (
    <div className={`flex flex-col items-start ${podiumColClass(size)}`}>
      <div className="flex h-8 items-end sm:h-12">
        <RankMarker rank={entry.place} size={isWinner ? "lg" : "md"} />
      </div>
      <OptionalGameLink
        slug={entry.slug}
        className="mt-2 block w-full min-w-0 sm:mt-3"
      >
        <GameCover
          title={entry.title}
          imageUrl={entry.coverUrl}
          fluid
          priority={isWinner}
          unoptimized
          width={isWinner ? PODIUM_COVER.width : RUNNER_MAX.width}
          height={isWinner ? PODIUM_COVER.height : RUNNER_MAX.height}
        />
      </OptionalGameLink>
    </div>
  );
}

function PodiumCaption({
  entry,
  size,
}: {
  entry: WinnerPodiumEntry;
  size: "winner" | "runner";
}) {
  const isWinner = size === "winner";
  const titleMax = isWinner ? 28 : 18;
  return (
    <div className={`flex flex-col items-start text-left ${podiumColClass(size)}`}>
      <OptionalGameLink
        slug={entry.slug}
        className="group mt-2 block w-full min-w-0 sm:mt-3"
      >
        <StandingCardTitle title={entry.title} maxPx={titleMax} />
      </OptionalGameLink>
      {entry.meta ? (
        <p className="mt-1.5 text-xs text-muted sm:mt-2 sm:text-sm">
          {entry.meta}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Awards podium: #1 · #2 · #3 left-aligned; cover bottoms share a baseline
 * so the larger winner stands taller. Fits 360px without horizontal scroll.
 */
export function WinnerPodium({
  winner,
  runnersUp,
  eyebrow,
}: {
  winner: WinnerPodiumEntry;
  runnersUp: WinnerPodiumEntry[];
  /** Optional section label (e.g. "Winner"). Omit when the parent already titles the block. */
  eyebrow?: string;
}) {
  const columns: { entry: WinnerPodiumEntry; size: "winner" | "runner" }[] =
    [winner, ...runnersUp].map((entry) => ({
      entry,
      size: entry.place === 1 ? ("winner" as const) : ("runner" as const),
    }));

  return (
    <section>
      {eyebrow ? (
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className={eyebrow ? "mt-6" : "mt-0"}>
        <div className="flex max-w-full items-end justify-start gap-2 sm:gap-4 md:gap-8">
          {columns.map(({ entry, size }) => (
            <PodiumCoverStack key={entry.gameId} entry={entry} size={size} />
          ))}
        </div>
        <div className="flex max-w-full items-start justify-start gap-2 sm:gap-4 md:gap-8">
          {columns.map(({ entry, size }) => (
            <PodiumCaption key={entry.gameId} entry={entry} size={size} />
          ))}
        </div>
      </div>
    </section>
  );
}
