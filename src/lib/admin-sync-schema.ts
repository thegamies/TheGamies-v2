import { z } from "zod";

export const adminSyncBodySchema = z.object({
  action: z.enum([
    "backfill",
    "incremental",
    "enrich",
    "import",
    "status",
  ]),
  year: z.number().int().optional(),
  afterId: z.number().int().optional(),
  maxPages: z.number().int().positive().optional(),
  entity: z
    .enum([
      "covers",
      "platforms",
      "genres",
      "themes",
      "keywords",
      "game_types",
      "involved_companies",
      "companies",
      "ttb",
      "all",
    ])
    .optional(),
});

export type AdminSyncBody = z.infer<typeof adminSyncBodySchema>;
