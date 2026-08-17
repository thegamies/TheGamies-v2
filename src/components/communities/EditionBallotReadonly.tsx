import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { CategoryPickCard, CategoryVoteHeading } from "@/components/ui/CategoryPickCard";
import { SectionRule } from "@/components/ui/SectionRule";
import { BallotRankGrid } from "@/components/communities/BallotRankGrid";
import { StandingGameCard } from "@/components/communities/StandingGameCard";

type CategoryMeta = {
  id: string;
  label: string;
  description?: string | null;
};

type BallotItem = {
  gameId: string;
  slug?: string;
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
  if (items.length === 0 && categoryVotes.length === 0 && categories.length === 0) {
    return <p className="mt-6 max-w-xl text-muted">{emptyMessage}</p>;
  }

  const voteById = new Map(categoryVotes.map((v) => [v.categoryId, v]));
  const ranked = [...items].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mt-8 space-y-10">
      {ranked.length > 0 ? (
        <section>
          <BallotChapterHeader eyebrow="Top 10" title="Game of the Year" />
          <BallotRankGrid>
            {ranked.map((item) => (
              <li key={item.gameId} className="min-w-0">
                <StandingGameCard
                  place={item.rank}
                  slug={item.slug ?? item.gameId}
                  title={item.title}
                  coverUrl={item.coverUrl}
                  priority={item.rank <= 3}
                />
              </li>
            ))}
          </BallotRankGrid>
        </section>
      ) : (
        <p className="text-muted">No Game of the Year ranking on this ballot.</p>
      )}

      {categories.length > 0 ? (
        <section>
          <SectionRule />
          <BallotChapterHeader
            className="mt-8"
            eyebrow="Categories"
            title="Award picks"
          />
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {categories.map((category) => {
              const vote = voteById.get(category.id);
              return (
                <li key={category.id} className="py-6">
                  {vote ? (
                    <CategoryPickCard
                      label={category.label}
                      description={category.description}
                      title={vote.title}
                      coverUrl={vote.coverUrl}
                    />
                  ) : (
                    <div>
                      <CategoryVoteHeading
                        label={category.label}
                        description={category.description}
                      />
                      <p className="mt-3 text-sm text-muted">No pick</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
