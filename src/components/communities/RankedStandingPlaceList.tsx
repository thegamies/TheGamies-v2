import { CompactTieStack } from "@/components/communities/CompactTieStack";
import {
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { StandingStrip } from "@/components/communities/StandingStrip";
import { SupportWatchLink } from "@/components/media/SupportWatchLink";
import { RankMarker } from "@/components/ui/RankMarker";
import { groupByRank } from "@/lib/standings/shared-rank";

export type RankedStandingPlaceRow = {
  rank: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  points?: number | null;
  supportLinkUrl?: string | null;
};

function scoreCopy(
  points: number | null | undefined,
  scoreUnit: "pts" | "votes",
): string | null {
  if (points == null || !Number.isFinite(points)) return null;
  if (scoreUnit === "votes") {
    return `${points} ${points === 1 ? "vote" : "votes"}`;
  }
  return `${points} pts`;
}

/**
 * One strip column per displayed place. Tied games share a CompactTieStack
 * footprint instead of N full cards (the main Results/Categories booklet cut).
 */
function RankedPlaceColumn({
  rank,
  rows,
  scoreUnit,
  pinCover,
  priority,
}: {
  rank: number;
  rows: RankedStandingPlaceRow[];
  scoreUnit: "pts" | "votes";
  pinCover: boolean;
  priority: boolean;
}) {
  if (rows.length === 1) {
    const row = rows[0]!;
    return (
      <>
        <StandingGameCard
          place={rank}
          placeSize="lg"
          slug={row.slug}
          title={row.title}
          coverUrl={row.coverUrl}
          points={row.points}
          scoreUnit={scoreUnit}
          priority={priority}
          pinCover={pinCover}
        />
        {row.supportLinkUrl ? (
          <SupportWatchLink url={row.supportLinkUrl} />
        ) : null}
      </>
    );
  }

  const points = rows[0]?.points;
  const meta = scoreCopy(points, scoreUnit);
  const support = rows.find((r) => r.supportLinkUrl)?.supportLinkUrl ?? null;

  return (
    <div className={pinCover ? "flex h-full flex-col" : undefined}>
      <div className="flex min-w-0 items-start gap-2">
        <RankMarker rank={rank} size="lg" className="shrink-0 pt-1" />
        <div className="min-w-0 flex-1">
          <CompactTieStack
            games={rows.map((row) => ({
              gameId: row.gameId,
              slug: row.slug,
              title: row.title,
              coverUrl: row.coverUrl,
            }))}
            className="w-full"
            titleMaxPx={rank === 1 ? 22 : 16}
          />
          {meta ? (
            <p className="mt-0.5 text-xs leading-none tracking-wide text-muted tabular-nums">
              {meta}
            </p>
          ) : null}
          {support ? <SupportWatchLink url={support} /> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Ranked podium / category strip: native overflow, one column per place.
 */
export function RankedStandingPlaceList({
  rows,
  label,
  scoreUnit = "votes",
  pinCover = true,
  className = "mt-4",
}: {
  rows: RankedStandingPlaceRow[];
  label: string;
  scoreUnit?: "pts" | "votes";
  pinCover?: boolean;
  className?: string;
}) {
  const places = groupByRank(rows);
  if (places.length === 0) return null;

  return (
    <StandingStrip className={className} label={label}>
      <ul className={standingStripListClass}>
        {places.map((place) => (
          <li
            key={place.rank}
            className={standingStripColClass(place.rank === 1)}
          >
            <RankedPlaceColumn
              rank={place.rank}
              rows={place.rows}
              scoreUnit={scoreUnit}
              pinCover={pinCover}
              priority={place.rank === 1}
            />
          </li>
        ))}
      </ul>
    </StandingStrip>
  );
}
