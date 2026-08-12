import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";

type CategoryMeta = {
  id: string;
  label: string;
};

type BallotItem = {
  gameId: string;
  title: string;
  coverUrl: string | null;
  rank: number;
  blurb?: string | null;
};

type CategoryVote = {
  categoryId: string;
  title: string;
  coverUrl: string | null;
};

type Props = {
  items: BallotItem[];
  categoryVotes: CategoryVote[];
  categories: CategoryMeta[];
  emptyMessage: string;
};

export function EditionBallotReadonly({
  items,
  categoryVotes,
  categories,
  emptyMessage,
}: Props) {
  if (items.length === 0 && categoryVotes.length === 0) {
    return <p className="mt-6 max-w-xl text-muted">{emptyMessage}</p>;
  }

  const labelById = new Map(categories.map((c) => [c.id, c.label]));

  return (
    <div className="mt-8 space-y-10">
      {items.length > 0 ? (
        <ol className="space-y-3">
          {items.map((item) => (
            <li
              key={item.gameId}
              className="flex items-stretch border border-line bg-panel"
            >
              <div className="flex w-12 shrink-0 items-center justify-center border-r border-line">
                <RankMarker rank={item.rank} />
              </div>
              <div className="flex min-w-0 flex-1 items-start gap-3 p-3">
                <div className="w-12 shrink-0">
                  <GameCover title={item.title} imageUrl={item.coverUrl} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.title}</p>
                  {item.blurb ? (
                    <p className="mt-2 text-sm text-muted">{item.blurb}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">No Game of the Year ranking on this ballot.</p>
      )}

      {categoryVotes.length > 0 ? (
        <section className="border-t border-line pt-8">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
            Categories
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-wide text-ink">
            Award picks
          </h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {categoryVotes.map((vote) => (
              <li
                key={vote.categoryId}
                className="flex items-center gap-3 py-4"
              >
                <div className="w-10 shrink-0">
                  <GameCover title={vote.title} imageUrl={vote.coverUrl} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted">
                    {labelById.get(vote.categoryId) ?? vote.categoryId}
                  </p>
                  <p className="font-semibold text-ink">{vote.title}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
