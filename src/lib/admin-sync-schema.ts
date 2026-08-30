import { z } from "zod";

const syncEntitySchema = z.enum([
  "covers",
  "artworks",
  "screenshots",
  "game_videos",
  "image_types",
  "platforms",
  "genres",
  "themes",
  "keywords",
  "game_types",
  "involved_companies",
  "companies",
  "ttb",
  "games",
  "all",
]);

export const adminSyncBodySchema = z.object({
  action: z.enum([
    "backfill",
    "incremental",
    "enrich",
    "import",
    "status",
    "catalog",
    "updated",
  ]),
  year: z.number().int().optional(),
  afterId: z.number().int().optional(),
  maxPages: z.number().int().positive().optional(),
  sinceUnix: z.number().int().optional(),
  reset: z.boolean().optional(),
  entity: syncEntitySchema.optional(),
});

export type AdminSyncBody = z.infer<typeof adminSyncBodySchema>;
