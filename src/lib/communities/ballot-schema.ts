import { z } from "zod";
import { LIST_MAX_ITEMS, listItemInputSchema } from "@/lib/lists/schema";
import { replaceCategoryVotesSchema } from "@/lib/live-aggregate/schema";

export const saveEditionBallotItemsSchema = z
  .array(listItemInputSchema)
  .max(LIST_MAX_ITEMS)
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

export const saveEditionBallotInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  year: z.coerce.number().int().min(1970).max(2100),
  items: saveEditionBallotItemsSchema,
  categoryVotes: saveEditionBallotCategoryVotesSchema,
});

export type SaveEditionBallotInput = z.infer<
  typeof saveEditionBallotInputSchema
>;
