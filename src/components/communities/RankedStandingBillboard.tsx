import { ballotRankGridClass } from "@/components/communities/BallotRankGrid";
import { CompactTieStack } from "@/components/communities/CompactTieStack";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { RankMarker } from "@/components/ui/RankMarker";
import { groupByRank } from "@/lib/standings/shared-rank";

export type RankedStandingItem = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  points?: number | null;
};

function categoryColClass(place: number): string {
  if (place === 1) {
    return "w-[168px] shrink-0 sm:w-[190px] md:w-[206px]";
  }
  return "w-[128px] shrink-0 sm:w-[148px] md:w-[168px]";
}

function RankedCard({
  row,
  priority,
}: {
  row: RankedStandingItem;
  priority: boolean;
}) {
  return (
    <StandingGameCard
      place={row.place}
      placeSize="lg"
      slug={row.slug}
      title={row.title}
      coverUrl={row.coverUrl}
      points={row.points}
      priority={priority}
    />
  );
}

function RankedPlaceCell({
  place,
  rows,
  priority,
}: {
  place: number;
  rows: RankedStandingItem[];
  priority: boolean;
}) {
  if (rows.length === 1) {
    return <RankedCard row={rows[0]!} priority={priority} />;
  }

  const points = rows[0]?.points;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <RankMarker rank={place} size="lg" className="shrink-0 pt-1" />
      <div className="min-w-0 flex-1">
        <CompactTieStack
          games={rows.map((row) => ({
            gameId: row.gameId,
            slug: row.slug,
            title: row.title,
            coverUrl: row.coverUrl,
          }))}
          className="w-full"
          titleMaxPx={place <= 3 ? 22 : 16}
        />
        {points != null && Number.isFinite(points) ? (
          <p className="mt-0.5 text-xs leading-none tracking-wide text-muted tabular-nums">
            {points} pts
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ranked GOTY layout. Place sits in front of the title with a larger
 * display marker; pts hug the last title line when provided. GOTY Top 10:
 * even wrapping grid. Tied places share one stack footprint.
 */
export function RankedStandingBillboard({
  items,
  emptyMessage,
  className = "mt-6",
}: {
  items: RankedStandingItem[];
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    if (!emptyMessage) return null;
    return <p className={`${className} text-muted`}>{emptyMessage}</p>;
  }

  const places = groupByRank(
    items.map((row) => ({ ...row, rank: row.place })),
  );
  const short = places.length <= 3;

  if (short) {
    return (
      <ul
        className={`${className} flex items-end justify-start gap-3 sm:gap-5 md:gap-6`}
      >
        {places.map((group) => (
          <li key={group.rank} className={categoryColClass(group.rank)}>
            <RankedPlaceCell
              place={group.rank}
              rows={group.rows}
              priority={group.rank === 1}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`${className} ${ballotRankGridClass}`}>
      {places.map((group) => (
        <li key={group.rank} className="min-w-0">
          <RankedPlaceCell
            place={group.rank}
            rows={group.rows}
            priority={group.rank <= 3}
          />
        </li>
      ))}
    </ul>
  );
}
