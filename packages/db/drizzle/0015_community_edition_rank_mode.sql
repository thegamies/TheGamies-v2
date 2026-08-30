ALTER TABLE "community_editions" ADD COLUMN "rank_mode" text DEFAULT 'competition' NOT NULL;
--> statement-breakpoint
ALTER TABLE "community_editions" ADD CONSTRAINT "community_editions_rank_mode_check" CHECK ("rank_mode" IN ('competition', 'dense'));
