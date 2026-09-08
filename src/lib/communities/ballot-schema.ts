import { z } from "zod";
import { listItemInputSchema } from "@/lib/lists/schema";
import { replaceCategoryVotesSchema } from "@/lib/live-aggregate/schema";

/** Event ballots score top 10 only; the ballot itself is capped to match. */
export const EDITION_BALLOT_MAX_ITEMS = 10;

export const editionBallotItemInputSchema = listItemInputSchema.extend({
  rank: z.number().int().min(1).max(EDITION_BALLOT_MAX_ITEMS),
});

export function capEditionBallotItems<T extends { rank: number }>(
  items: T[],
): T[] {
  return [...items]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, EDITION_BALLOT_MAX_ITEMS)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

/** Stable key for dirty-checking a ballot draft. Vote order does not matter. */
export function editionBallotDraftKey(input: {
  items: Array<{ gameId: string; rank: number; blurb?: string | null }>;
  categoryVotes: Array<{ categoryId: string; gameId: string }>;
  customCategoryVotes?: Array<{
    categoryId: string;
    gameId?: string | null;
    entryId?: string | null;
  }>;
}): string {
  return JSON.stringify({
    items: input.items.map((item) => ({
      gameId: item.gameId,
      rank: item.rank,
      blurb: (item.blurb ?? "").trim(),
    })),
    categoryVotes: [...input.categoryVotes]
      .map((vote) => ({
        categoryId: vote.categoryId,
        gameId: vote.gameId,
      }))
      .sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
    customCategoryVotes: [...(input.customCategoryVotes ?? [])]
      .map((vote) => ({
        categoryId: vote.categoryId,
        gameId: vote.gameId ?? null,
        entryId: vote.entryId ?? null,
      }))
      .sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
  });
}

/**
 * Keep only picks for awards currently on the event.
 * Leftover votes (host removed an award, or an empty enabled set) must not
 * block saving the GOTY ranking.
 */
export function filterCategoryVotesToEnabled<T extends { categoryId: string }>(
  votes: readonly T[],
  enabledIds: ReadonlySet<string> | readonly string[],
): T[] {
  const enabled =
    enabledIds instanceof Set ? enabledIds : new Set(enabledIds);
  if (enabled.size === 0) return [];
  return votes.filter((vote) => enabled.has(vote.categoryId));
}

export const saveEditionBallotItemsSchema = z
  .array(editionBallotItemInputSchema)
  .max(EDITION_BALLOT_MAX_ITEMS, {
    message: `Ballots can hold at most ${EDITION_BALLOT_MAX_ITEMS} games.`,
  })
  .superRefine((items, ctx) => {
    const keys = new Set<string>();
    const ranks = new Set<number>();
    for (const item of items) {
      if (keys.has(item.gameId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each game can appear only once.",
        });
        return;
      }
      if (ranks.has(item.rank)) {
        ctx.addIssue({
          code: "custom",
          message: "Ranks must be unique.",
        });
        return;
      }
      keys.add(item.gameId);
      ranks.add(item.rank);
    }
  });

export const saveEditionBallotCategoryVotesSchema = replaceCategoryVotesSchema;

export const saveEditionBallotCustomVoteSchema = z
  .object({
    categoryId: z.string().uuid(),
    gameId: z.string().uuid().optional().nullable(),
    entryId: z.string().uuid().optional().nullable(),
  })
  .superRefine((vote, ctx) => {
    const hasGame = Boolean(vote.gameId);
    const hasEntry = Boolean(vote.entryId);
    if (hasGame === hasEntry) {
      ctx.addIssue({
        code: "custom",
        message: "Each community category pick needs a game or an entry.",
      });
    }
  });

export const saveEditionBallotCustomVotesSchema = z
  .array(saveEditionBallotCustomVoteSchema)
  .max(200)
  .superRefine((votes, ctx) => {
    const seen = new Set<string>();
    for (const vote of votes) {
      if (seen.has(vote.categoryId)) {
        ctx.addIssue({
          code: "custom",
          message: "Only one pick per community category.",
        });
        return;
      }
      seen.add(vote.categoryId);
    }
  });

export const saveEditionBallotInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  year: z.coerce.number().int().min(1970).max(2100),
  items: saveEditionBallotItemsSchema,
  categoryVotes: saveEditionBallotCategoryVotesSchema,
  customCategoryVotes: saveEditionBallotCustomVotesSchema.default([]),
});

export type SaveEditionBallotInput = z.infer<
  typeof saveEditionBallotInputSchema
>;
