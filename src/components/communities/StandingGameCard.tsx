import Link from "next/link";
import { FitDisplayTitle } from "@/components/ui/FitDisplayTitle";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import {
  MATRIX_COVER,
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
   * `sm` — matrix / strip cards (half of 206×275).
   */
  size?: "md" | "sm";
};

/**
 * Same card language as games browse: GameCover + title (+ optional meta).
 * Rank (if any) sits in front of the title — not on the cover. Ballot matrix
 * omits place (uses the `#` column). Titles clamp to 3 lines and shrink toward a 12px floor.
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
}: StandingGameCardProps) {
  const scoreLabel =
    points != null
      ? `${points} ${scoreUnit === "votes" ? (points === 1 ? "vote" : "votes") : "pts"}`
      : null;
  const meta =
    scoreLabel && year != null
      ? `${scoreLabel} · ${year}`
      : (scoreLabel ?? (year != null ? String(year) : null));

  const titleBlock = (
    <div className="mt-2 flex items-baseline gap-1">
      {place != null ? (
        <span
          className={`shrink-0 font-display leading-none tracking-wide text-accent ${
            size === "sm" ? "text-[14px]" : "text-[18px]"
          }`}
          aria-label={`Rank ${place}`}
        >
          {place}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <FitDisplayTitle
          className="w-full group-hover:text-accent"
          maxPx={size === "sm" ? 14 : 18}
          minPx={12}
        >
          {title}
        </FitDisplayTitle>
        {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
      </div>
    </div>
  );

  if (size === "sm") {
    return (
      <Link href={`/games/${slug}`} className="group block w-[103px]" draggable={false}>
        <GameCover
          title={title}
          imageUrl={coverUrl}
          priority={priority}
          width={MATRIX_COVER.width}
          height={MATRIX_COVER.height}
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
  meta: string;
};

/** #2/#3 relative to rank-1 — desktop max matches ~72% of podium art. */
const RUNNER_MAX = {
  width: Math.round(PODIUM_COVER.width * 0.72),
  height: Math.round(PODIUM_COVER.height * 0.72),
} as const;

function PodiumColumn({
  entry,
  size,
}: {
  entry: WinnerPodiumEntry;
  size: "winner" | "runner";
}) {
  const isWinner = size === "winner";
  const titleMax = isWinner ? 28 : 18;
  const colClass = isWinner
    ? "min-w-0 flex-[1.35] max-w-[206px]"
    : "min-w-0 flex-1 max-w-[148px]";

  return (
    <div className={`flex flex-col items-start text-left ${colClass}`}>
      <div className="flex h-8 items-end sm:h-12">
        <RankMarker rank={entry.place} size={isWinner ? "lg" : "md"} />
      </div>
      <Link
        href={`/games/${entry.slug}`}
        className="group mt-2 block w-full min-w-0 sm:mt-3"
      >
        <GameCover
          title={entry.title}
          imageUrl={entry.coverUrl}
          fluid
          priority={isWinner}
          width={isWinner ? PODIUM_COVER.width : RUNNER_MAX.width}
          height={isWinner ? PODIUM_COVER.height : RUNNER_MAX.height}
        />
        <FitDisplayTitle
          className="mt-2 group-hover:text-accent sm:mt-3"
          maxPx={titleMax}
          minPx={12}
        >
          {entry.title}
        </FitDisplayTitle>
      </Link>
      <p className="mt-1.5 text-xs text-muted sm:mt-2 sm:text-sm">{entry.meta}</p>
    </div>
  );
}

/**
 * Awards podium: #1 · #2 · #3 left-aligned, tops aligned.
 * Scales to fit a 360px-wide viewport without horizontal scroll.
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
  const second =
    runnersUp.find((r) => r.place === 2) ?? runnersUp[0] ?? null;
  const third =
    runnersUp.find((r) => r.place === 3) ??
    (runnersUp.length > 1 ? runnersUp[1] : null);

  return (
    <section>
      {eyebrow ? (
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className={eyebrow ? "mt-6" : "mt-0"}>
        <div className="flex w-full max-w-full items-start gap-2 sm:gap-4 md:gap-8">
          <PodiumColumn entry={winner} size="winner" />
          {second ? <PodiumColumn entry={second} size="runner" /> : null}
          {third ? <PodiumColumn entry={third} size="runner" /> : null}
        </div>
      </div>
    </section>
  );
}
