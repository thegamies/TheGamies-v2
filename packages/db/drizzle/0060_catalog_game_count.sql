ALTER TABLE "site_settings" ADD COLUMN "catalog_game_count" integer;--> statement-breakpoint
UPDATE "site_settings"
SET "catalog_game_count" = (
  SELECT count(*)::int
  FROM "games"
  WHERE "games"."igdb_removed_at" IS NULL
    AND "games"."is_adult" = false
)
WHERE "id" = 'default';
