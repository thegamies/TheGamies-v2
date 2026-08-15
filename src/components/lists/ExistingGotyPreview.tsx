import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
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
    <div className="max-w-2xl space-y-6">
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
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {topFive.map((item) => (
            <li key={item.gameId} className="min-w-0">
              <div className="mb-1.5">
                <RankMarker rank={item.rank} size="sm" />
              </div>
              <GameCover
                title={item.title}
                imageUrl={item.coverUrl}
                fluid
                width={120}
              />
              <p className="mt-2 truncate text-sm font-semibold text-ink">
                {item.title}
              </p>
            </li>
          ))}
        </ol>
      )}

      <Link href={existingGotyEditHref(publicId)}>
        <Button type="button">Edit list</Button>
      </Link>
    </div>
  );
}
