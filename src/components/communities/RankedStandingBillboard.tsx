import { ballotRankGridClass } from "@/components/communities/BallotRankGrid";
import { StandingGameCard } from "@/components/communities/StandingGameCard";

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
    return "min-w-0 flex-[1.5] max-w-[168px] sm:max-w-[190px] md:max-w-[206px]";
  }
  return "min-w-0 flex-1 max-w-[128px] sm:max-w-[148px] md:max-w-[168px]";
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

/**
 * Ranked GOTY layout. Place sits in front of the title with a larger
 * display marker; pts hug the last title line when provided. GOTY Top 10:
 * even wrapping grid.
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

  const short = items.length <= 3;

  if (short) {
    return (
      <ul
        className={`${className} flex items-end justify-start gap-3 sm:gap-5 md:gap-6`}
      >
        {items.map((row) => (
          <li key={row.gameId} className={categoryColClass(row.place)}>
            <RankedCard row={row} priority={row.place === 1} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`${className} ${ballotRankGridClass}`}>
      {items.map((row) => (
        <li key={row.gameId} className="min-w-0">
          <RankedCard row={row} priority={row.place <= 3} />
        </li>
      ))}
    </ul>
  );
}
