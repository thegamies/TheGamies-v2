ALTER TABLE "site_settings" ADD COLUMN "rank_mode" text DEFAULT 'competition' NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_rank_mode_check" CHECK ("rank_mode" IN ('competition', 'dense'));
