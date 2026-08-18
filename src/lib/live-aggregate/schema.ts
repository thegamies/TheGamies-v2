import { z } from "zod";

export const categoryVoteSchema = z.object({
  categoryId: z.string().min(1).max(64),
  gameId: z.string().uuid(),
});

/** Site catalog is ~86 awards; keep headroom so a full event ballot can save. */
export const MAX_CATEGORY_VOTES = 200;

export const replaceCategoryVotesSchema = z
  .array(categoryVoteSchema)
  .max(MAX_CATEGORY_VOTES)
  .superRefine((votes, ctx) => {
    const seen = new Set<string>();
    for (const vote of votes) {
      if (seen.has(vote.categoryId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only one game per category.",
        });
        return;
      }
      seen.add(vote.categoryId);
    }
  });

export type CategoryVoteInput = z.infer<typeof categoryVoteSchema>;
