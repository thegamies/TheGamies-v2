import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { CategoryPickCard, CategoryVoteHeading } from "@/components/ui/CategoryPickCard";
import { BallotRankGrid } from "@/components/communities/BallotRankGrid";
import { EditionBallotListExport } from "@/components/communities/EditionBallotListExport";
import { StandingGameCard } from "@/components/communities/StandingGameCard";
import { mergeEditionBallotCategories } from "@/lib/communities/edition-ballot-categories";
import type { CustomCategoryView } from "@/lib/communities/custom-category-types";
import type { EditionBallotCustomCategoryVoteView } from "@/lib/communities/ballots";

type CategoryMeta = {
  id: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
  categoryGroup?: string;
  eligibility?: string;
  allowEditions?: boolean;
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
  customCategoryVotes?: EditionBallotCustomCategoryVoteView[];
  customCategories?: CustomCategoryView[];
  emptyMessage: string;
  /** Your ballot only — never on someone else’s published ballot. */
  exportToList?: { slug: string; year: number } | null;
};

export function EditionBallotReadonly({
  items,
  categoryVotes,
  categories,
  customCategoryVotes = [],
  customCategories = [],
  emptyMessage,
  exportToList = null,
}: Props) {
  if (
    items.length === 0 &&
    categoryVotes.length === 0 &&
    categories.length === 0 &&
    customCategories.length === 0 &&
    customCategoryVotes.length === 0
  ) {
    return <p className="mt-6 max-w-xl text-muted">{emptyMessage}</p>;
  }

  const voteById = new Map(categoryVotes.map((v) => [v.categoryId, v]));
  const customById = new Map(
    customCategoryVotes.map((v) => [v.categoryId, v]),
  );
  const ranked = [...items].sort((a, b) => a.rank - b.rank);
  const canExport = ranked.length > 0 || categoryVotes.length > 0;
  const exportAction =
    exportToList && canExport ? (
      <EditionBallotListExport
        slug={exportToList.slug}
        year={exportToList.year}
        canExport
      />
    ) : null;
  const ballotCategories = mergeEditionBallotCategories({
    site: categories.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description ?? null,
      sortOrder: c.sortOrder ?? 0,
      categoryGroup: c.categoryGroup ?? "premier",
      eligibility: c.eligibility ?? "current_year",
      allowEditions: c.allowEditions === true,
    })),
    custom: customCategories,
  });

  return (
    <div className="mt-8 space-y-10">
      {ranked.length > 0 || exportAction ? (
        <section>
          <BallotChapterHeader
            eyebrow="Top 10"
            title="Game of the Year"
            actions={exportAction}
          />
          {ranked.length > 0 ? (
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
          ) : (
            <p className="mt-6 text-muted">
              No Game of the Year ranking on this ballot.
            </p>
          )}
        </section>
      ) : (
        <p className="text-muted">No Game of the Year ranking on this ballot.</p>
      )}

      {ballotCategories.length > 0 ? (
        <section>
          <BallotChapterHeader
            eyebrow="Categories"
            title="Award picks"
          />
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {ballotCategories.map((item) => {
              if (item.kind === "site") {
                const vote = voteById.get(item.id);
                return (
                  <li key={`site:${item.id}`} className="py-6">
                    {vote ? (
                      <CategoryPickCard
                        label={item.label}
                        description={item.description}
                        title={vote.title}
                        coverUrl={vote.coverUrl}
                      />
                    ) : (
                      <div>
                        <CategoryVoteHeading
                          label={item.label}
                          description={item.description}
                        />
                        <p className="mt-3 text-sm text-muted">No pick</p>
                      </div>
                    )}
                  </li>
                );
              }

              const vote = customById.get(item.id);
              const cover = vote?.imageUrl || vote?.coverUrl || null;
              return (
                <li key={`custom:${item.id}`} className="py-6">
                  {vote ? (
                      <CategoryPickCard
                        label={`${item.label} · Community`}
                        description={item.description}
                        title={
                          vote.subtitle
                            ? `${vote.title} — ${vote.subtitle}`
                            : vote.title
                        }
                        coverUrl={cover}
                        watchUrl={vote.supportLinkUrl}
                      />
                  ) : (
                    <div>
                      <CategoryVoteHeading
                        label={`${item.label} · Community`}
                        description={item.description}
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
