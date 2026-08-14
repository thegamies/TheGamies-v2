import Link from "next/link";
import { FitDisplayTitle } from "@/components/ui/FitDisplayTitle";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import {
  MATRIX_COVER_WIDE,
  PODIUM_COVER,
} from "@/components/communities/coverSizes";

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
};

/**
 * Same card language as games browse: GameCover + title (+ optional meta).
 * Rank (if any) sits in front of the title — not on the cover. Comparison
 * strips omit place (column headers name the source). Titles reserve and clamp
 * to 2 lines and shrink toward a 12px floor.
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
}: StandingGameCardProps) {
  const scoreLabel =
    points != null
      ? `${points} ${scoreUnit === "votes" ? (points === 1 ? "vote" : "votes") : "pts"}`
      : null;
  const meta =
    scoreLabel && year != null
      ? `${scoreLabel} · ${year}`
      : (scoreLabel ?? (year != null ? String(year) : null));

  const placeClass =
    placeSize === "lg"
      ? place != null && place <= 3
        ? "text-[2rem] sm:text-[2.5rem] md:text-[2.75rem]"
        : "text-[1.5rem] sm:text-[1.85rem] md:text-[2.1rem]"
      : size === "sm"
        ? "text-[14px] lg:text-[18px]"
        : "text-[18px]";

  const titleBlock = (
    <div
      className={`mt-2 flex ${
        placeSize === "lg" ? "items-start gap-2" : "items-baseline gap-1"
      }`}
    >
      {place != null ? (
        <span
          className={`shrink-0 font-display leading-none tracking-wide text-accent ${placeClass}`}
          aria-label={`Rank ${place}`}
        >
          {place}
        </span>
      ) : null}
      <div className={`min-w-0 flex-1 ${placeSize === "lg" ? "pt-1" : ""}`}>
        <FitDisplayTitle
          className="w-full group-hover:text-accent"
          maxPx={
            placeSize === "lg"
              ? place != null && place <= 3
                ? 20
                : 16
              : 18
          }
          minPx={12}
          lines={2}
        >
          {title}
        </FitDisplayTitle>
        {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
      </div>
    </div>
  );

  if (size === "sm") {
    return (
      <Link
        href={`/games/${slug}`}
        className="group block w-[103px] lg:w-[206px]"
        draggable={false}
      >
        <GameCover
          title={title}
          imageUrl={coverUrl}
          priority={priority}
          fluid
          width={MATRIX_COVER_WIDE.width}
          height={MATRIX_COVER_WIDE.height}
        />
        {titleBlock}
      </Link>
    );
  }

  return (
    <Link href={`/games/${slug}`} className="group block" draggable={false}>
      <GameCover title={title} imageUrl={coverUrl} priority={priority} />
      {titleBlock}
    </Link>
  );
}

/** Same footprint as `StandingGameCard` sm — empty cover + reserved 2-line caption. */
export function EmptyStandingCard({
  label = "No pick",
}: {
  label?: string;
}) {
  return (
    <div
      className="w-[103px] lg:w-[206px]"
      aria-label={label}
    >
      <div
        className="aspect-[3/4] w-full rounded-[var(--radius-artwork)] border border-line bg-panel"
        aria-hidden
      />
      <p
        className="mt-2 line-clamp-2 font-display text-[14px] leading-snug tracking-wide text-muted lg:text-[14px]"
        style={{
          minHeight: Math.ceil(2 * 14 * 1.375),
          lineHeight: 1.375,
        }}
      >
        {label}
      </p>
    </div>
  );
}

export function StandingGameCardGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </ul>
  );
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
    ? "min-w-0 flex-[1.35] max-w-[206px]"
    : "min-w-0 flex-1 max-w-[148px]";
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
      <Link
        href={`/games/${entry.slug}`}
        className="mt-2 block w-full min-w-0 sm:mt-3"
      >
        <GameCover
          title={entry.title}
          imageUrl={entry.coverUrl}
          fluid
          priority={isWinner}
          width={isWinner ? PODIUM_COVER.width : RUNNER_MAX.width}
          height={isWinner ? PODIUM_COVER.height : RUNNER_MAX.height}
        />
      </Link>
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
      <Link
        href={`/games/${entry.slug}`}
        className="group mt-2 block w-full min-w-0 sm:mt-3"
      >
        <FitDisplayTitle
          className="group-hover:text-accent"
          maxPx={titleMax}
          minPx={12}
          lines={2}
        >
          {entry.title}
        </FitDisplayTitle>
      </Link>
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
        <div className="flex w-full max-w-full items-end gap-2 sm:gap-4 md:gap-8">
          {columns.map(({ entry, size }) => (
            <PodiumCoverStack key={entry.gameId} entry={entry} size={size} />
          ))}
        </div>
        <div className="flex w-full max-w-full items-start gap-2 sm:gap-4 md:gap-8">
          {columns.map(({ entry, size }) => (
            <PodiumCaption key={entry.gameId} entry={entry} size={size} />
          ))}
        </div>
      </div>
    </section>
  );
}
