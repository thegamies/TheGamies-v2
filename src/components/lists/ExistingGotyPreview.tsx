import Link from "next/link";
import {
  StandingGameCard,
  standingStripColClass,
  standingStripListClass,
} from "@/components/communities/StandingGameCard";
import { HorizontalScroll } from "@/components/ui/HorizontalScroll";
import { existingGotyEditHref } from "@/lib/lists/existing-goty";
import {
  type ListShareView,
  withListShareView,
} from "@/lib/lists/urls";

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
  editorView = "goty",
}: {
  year: number;
  publicId: string;
  title: string;
  items: ExistingGotyPreviewItem[];
  editorView?: ListShareView;
}) {
  const topFive = items.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
          {year}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-3xl tracking-wide text-ink">{title}</p>
          <Link
            href={withListShareView(existingGotyEditHref(publicId), editorView)}
            className="text-sm font-semibold tracking-wide text-accent hover:opacity-90"
          >
            Edit
          </Link>
        </div>
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
    </div>
  );
}
