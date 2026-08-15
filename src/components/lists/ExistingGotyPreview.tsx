import Link from "next/link";
import {
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { Button } from "@/components/ui/Button";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { existingGotyEditHref } from "@/lib/lists/existing-goty";

export type ExistingGotyPreviewItem = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  rank: number;
};

export function ExistingGotyPreview({
  year,
  publicId,
  title,
  items,
}: {
  year: number;
  publicId: string;
  title: string;
  items: ExistingGotyPreviewItem[];
}) {
  const topFive = items.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
          {year}
        </p>
        <p className="mt-2 font-display text-3xl tracking-wide text-ink">
          {title}
        </p>
      </div>

      {topFive.length === 0 ? (
        <p className="text-sm text-muted">No games ranked yet.</p>
      ) : (
        <HorizontalScroll label={`${year} top five`}>
          <ol className={standingStripListClass}>
            {topFive.map((item) => (
              <li
                key={item.gameId}
                className={standingStripColClass(item.rank === 1)}
              >
                <StandingGameCard
                  place={item.rank}
                  placeSize="lg"
                  slug={item.slug}
                  title={item.title}
                  coverUrl={item.coverUrl}
                  priority={item.rank === 1}
                  pinCover
                />
              </li>
            ))}
          </ol>
        </HorizontalScroll>
      )}

      <Link href={existingGotyEditHref(publicId)}>
        <Button type="button">Edit list</Button>
      </Link>
    </div>
  );
}
