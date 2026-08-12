DROP TABLE IF EXISTS "community_live_year_stats";
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "live_scores_visible_from" timestamp;
