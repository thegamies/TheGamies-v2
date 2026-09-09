"use client";

import { BallotChapterHeader } from "@/components/ui/BallotChapterHeader";
import { Button } from "@/components/ui/Button";
import { GameCover } from "@/components/ui/GameCover";
import { GameSearchField } from "@/components/ui/GameSearchField";
import type { CustomCategoryView } from "@/lib/communities/custom-category-types";
import {
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
} from "@/lib/communities/custom-category-types";
import { awardEligibilityCaption } from "@/lib/live-aggregate/award-category-defs";
import type { EditionBallotCustomCategoryVoteView } from "@/lib/communities/ballots";
import { SupportWatchLink } from "@/components/media/SupportWatchLink";

/** Same density as TGA nominee / standings cover grids. */
export const customCategoryEntryGridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 sm:gap-4";

export type CustomCategoryVoteSelection = {
  categoryId: string;
  gameId: string | null;
  entryId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  coverUrl: string | null;
};

export function CustomCategoryVotesEditor({
  categories,
  value,
  onChange,
  year,
}: {
  categories: CustomCategoryView[];
  value: CustomCategoryVoteSelection[];
  onChange: (next: CustomCategoryVoteSelection[]) => void;
  year: number;
}) {
  if (categories.length === 0) return null;

  const byId = new Map(value.map((v) => [v.categoryId, v]));

  function setVote(next: CustomCategoryVoteSelection) {
    onChange([
      ...value.filter((v) => v.categoryId !== next.categoryId),
      next,
    ]);
  }

  function clearVote(categoryId: string) {
    onChange(value.filter((v) => v.categoryId !== categoryId));
  }

  return (
    <section className="space-y-8">
      <BallotChapterHeader
        eyebrow="Community"
        title="Community categories"
        description="Awards created by this community. Choose one pick per category."
      />
      <ul className="space-y-8">
        {categories.map((cat) => (
          <li key={cat.id} className="border-t border-line pt-6">
            <CustomCategoryBallotBlock
              category={cat}
              pick={byId.get(cat.id) ?? null}
              year={year}
              onSelect={setVote}
              onClear={() => clearVote(cat.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One category as it appears on the ballot (heading + picks). */
export function CustomCategoryBallotBlock({
  category,
  pick,
  year,
  onSelect,
  onClear,
  interactive = true,
}: {
  category: CustomCategoryView;
  pick?: CustomCategoryVoteSelection | null;
  year?: number;
  onSelect?: (next: CustomCategoryVoteSelection) => void;
  onClear?: () => void;
  /** When false, entries are display-only (settings preview). */
  interactive?: boolean;
}) {
  const eligibility = parseCustomCategoryEligibility(category.eligibility);
  const eligibilityCaption =
    customAnswerTypeUsesEligibility(category.answerType)
      ? awardEligibilityCaption(eligibility, year)
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="font-display text-2xl tracking-wide text-ink">
          {category.name}
        </h3>
        <span className="text-xs uppercase tracking-wide text-muted">
          Community
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">{category.description}</p>
      {eligibilityCaption ? (
        <p className="mt-1 text-sm text-muted">{eligibilityCaption}</p>
      ) : null}

      {category.answerType === "any_game" ? (
        interactive && pick?.gameId ? (
          <div className="mt-4 flex max-w-sm items-start gap-3">
            <div className="w-24 shrink-0">
              <GameCover title={pick.title} imageUrl={pick.coverUrl} />
            </div>
            <div>
              <p className="font-semibold text-ink">{pick.title}</p>
              {onClear ? (
                <Button
                  type="button"
                  variant="bordered"
                  size="sm"
                  className="mt-2"
                  onClick={onClear}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        ) : interactive && year != null && onSelect ? (
          <div className="mt-4 max-w-md">
            <GameSearchField
              year={year}
              eligibility={parseCustomCategoryEligibility(category.eligibility)}
              aria-label={`Search games for ${category.name}`}
              onSelect={(hit) =>
                onSelect({
                  categoryId: category.id,
                  gameId: hit.id,
                  entryId: null,
                  title: hit.title,
                  subtitle: null,
                  imageUrl: null,
                  coverUrl: hit.coverUrl,
                })
              }
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Members search and pick any eligible game.
          </p>
        )
      ) : category.entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No entries yet.</p>
      ) : (
        <ul className={`mt-4 ${customCategoryEntryGridClass}`}>
          {category.entries.map((entry) => {
            const selected = pick?.entryId === entry.id;
            const media = entry.imageUrl || entry.coverUrl;
            const body = (
              <>
                {media ? (
                  <GameCover title={entry.title} imageUrl={media} />
                ) : (
                  <div className="aspect-[3/4] w-full border border-line bg-panel" />
                )}
                <span className="mt-2 block font-display text-lg leading-none tracking-wide text-ink">
                  {entry.title}
                </span>
                {entry.gameTitle ? (
                  <span className="mt-1 block text-sm text-muted">
                    {entry.gameTitle}
                  </span>
                ) : null}
                {entry.supportLinkUrl ? (
                  <SupportWatchLink url={entry.supportLinkUrl} />
                ) : null}
              </>
            );

            return (
              <li key={entry.id} className="min-w-0">
                {interactive && onSelect ? (
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onSelect({
                        categoryId: category.id,
                        gameId: null,
                        entryId: entry.id,
                        title: entry.title,
                        subtitle: entry.gameTitle,
                        imageUrl: entry.imageUrl,
                        coverUrl: entry.coverUrl,
                      })
                    }
                    className={`w-full min-w-0 text-left transition-opacity ${
                      selected ? "opacity-100" : "hover:opacity-90"
                    }`}
                  >
                    <span
                      className={
                        selected
                          ? "block ring-2 ring-accent ring-offset-2 ring-offset-paper"
                          : "block"
                      }
                    >
                      {body}
                    </span>
                  </button>
                ) : (
                  <div className="w-full min-w-0">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {interactive && category.answerType !== "any_game" && pick?.entryId && onClear ? (
        <Button
          type="button"
          variant="bordered"
          size="sm"
          className="mt-3"
          onClick={onClear}
        >
          Clear pick
        </Button>
      ) : null}
    </div>
  );
}

export function customVotesFromBallotView(
  votes: EditionBallotCustomCategoryVoteView[],
): CustomCategoryVoteSelection[] {
  return votes.map((v) => ({
    categoryId: v.categoryId,
    gameId: v.gameId,
    entryId: v.entryId,
    title: v.title,
    subtitle: v.subtitle,
    imageUrl: v.imageUrl,
    coverUrl: v.coverUrl,
  }));
}
