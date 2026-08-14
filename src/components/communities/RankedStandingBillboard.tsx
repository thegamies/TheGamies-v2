import { StandingGameCard } from "@/components/communities/StandingGameCard";

export type RankedStandingItem = {
  place: number;
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

function categoryColClass(place: number): string {
  if (place === 1) {
    return "min-w-0 flex-[1.5] max-w-[168px] sm:max-w-[190px] md:max-w-[206px]";
  }
  return "min-w-0 flex-1 max-w-[128px] sm:max-w-[148px] md:max-w-[168px]";
}

/**
 * Ranked Highlights layout. Place sits in front of the title with a larger
 * display marker. Category Top 3: tiered widths (#1 ≈ GOTY, #2/#3 smaller),
 * shared cover baseline. GOTY Top 10: even wrapping grid.
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
            <StandingGameCard
              place={row.place}
              placeSize="lg"
              slug={row.slug}
              title={row.title}
              coverUrl={row.coverUrl}
              priority={row.place === 1}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={`${className} grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5`}
    >
      {items.map((row) => (
        <li key={row.gameId} className="min-w-0">
          <StandingGameCard
            place={row.place}
            placeSize="lg"
            slug={row.slug}
            title={row.title}
            coverUrl={row.coverUrl}
            priority={row.place <= 3}
          />
        </li>
      ))}
    </ul>
  );
}
