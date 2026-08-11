import { z } from "zod";

export const categoryVoteSchema = z.object({
  categoryId: z.string().min(1).max(64),
  gameId: z.string().uuid(),
});

export const replaceCategoryVotesSchema = z
  .array(categoryVoteSchema)
  .max(50)
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
