import { z } from "zod";

export const LIST_MAX_ITEMS = 100;
export const LIST_TYPES = ["goty", "custom"] as const;
export const LIST_STATUSES = ["draft", "published"] as const;

export const listTypeSchema = z.enum(LIST_TYPES);
export const listStatusSchema = z.enum(LIST_STATUSES);

export const listTitleSchema = z.string().trim().min(1).max(120);

export const listYearSchema = z.coerce.number().int().min(1970).max(2100);

export const createGotyDraftSchema = z.object({
  listType: z.literal("goty"),
  year: listYearSchema,
  title: listTitleSchema.optional(),
});

export const createCustomDraftSchema = z.object({
  listType: z.literal("custom"),
  title: listTitleSchema,
  year: listYearSchema.optional(),
});

export const createDraftSchema = z.discriminatedUnion("listType", [
  createGotyDraftSchema,
  createCustomDraftSchema,
]);

export const listItemInputSchema = z.object({
  gameId: z.string().uuid(),
  rank: z.number().int().min(1).max(LIST_MAX_ITEMS),
  blurb: z.string().trim().max(500).optional().nullable(),
});

export const replaceItemsSchema = z
  .array(listItemInputSchema)
  .max(LIST_MAX_ITEMS)
  .superRefine((items, ctx) => {
    const gameIds = new Set<string>();
    const ranks = new Set<number>();
    for (const item of items) {
      if (gameIds.has(item.gameId)) {
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
      gameIds.add(item.gameId);
      ranks.add(item.rank);
    }
  });

export const updateListMetaSchema = z.object({
  title: listTitleSchema.optional(),
  year: listYearSchema.optional(),
  listType: listTypeSchema.optional(),
});
