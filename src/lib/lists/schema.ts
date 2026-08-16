import { z } from "zod";

export const LIST_MAX_ITEMS = 100;
/** Max length for per-game notes (UX + Zod). */
export const LIST_BLURB_MAX = 500;
export const LIST_TYPES = ["goty", "custom"] as const;

export const listTypeSchema = z.enum(LIST_TYPES);

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
  blurb: z.string().trim().max(LIST_BLURB_MAX).optional().nullable(),
});

export const listItemByIgdbInputSchema = z.object({
  igdbId: z.number().int().positive(),
  rank: z.number().int().min(1).max(LIST_MAX_ITEMS),
  blurb: z.string().trim().max(LIST_BLURB_MAX).optional().nullable(),
});

function refineUniqueRanks<T extends { rank: number }>(
  items: T[],
  ctx: z.RefinementCtx,
  key: (item: T) => string,
) {
  const keys = new Set<string>();
  const ranks = new Set<number>();
  for (const item of items) {
    const k = key(item);
    if (keys.has(k)) {
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
    keys.add(k);
    ranks.add(item.rank);
  }
}

export const replaceItemsSchema = z
  .array(listItemInputSchema)
  .max(LIST_MAX_ITEMS)
  .superRefine((items, ctx) => {
    refineUniqueRanks(items, ctx, (item) => item.gameId);
  });

export const replaceItemsByIgdbSchema = z
  .array(listItemByIgdbInputSchema)
  .max(LIST_MAX_ITEMS)
  .superRefine((items, ctx) => {
    refineUniqueRanks(items, ctx, (item) => String(item.igdbId));
  });

export const listRankStyleSchema = z.enum(["banner", "chip", "off"]);
export type ListRankStyle = z.infer<typeof listRankStyleSchema>;

export function parseStoredRankStyle(value: string): ListRankStyle {
  const parsed = listRankStyleSchema.safeParse(value);
  return parsed.success ? parsed.data : "chip";
}

export const listFormatSchema = z.enum(["poster", "list", "grid"]);
export type ListFormat = z.infer<typeof listFormatSchema>;

export function parseStoredListFormat(value: string): ListFormat {
  const parsed = listFormatSchema.safeParse(value);
  return parsed.success ? parsed.data : "grid";
}

export const clientDraftUpsertSchema = z.object({
  publicId: z.string().min(1).optional().nullable(),
  listType: listTypeSchema,
  title: listTitleSchema,
  year: listYearSchema.optional().nullable(),
  items: replaceItemsByIgdbSchema,
  rankStyle: listRankStyleSchema.optional(),
  showSuffix: z.boolean().optional(),
  listFormat: listFormatSchema.optional(),
});

export const updateListMetaSchema = z.object({
  title: listTitleSchema.optional(),
  year: listYearSchema.optional(),
  listType: listTypeSchema.optional(),
});
