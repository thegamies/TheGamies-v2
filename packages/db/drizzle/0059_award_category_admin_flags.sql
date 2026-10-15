ALTER TABLE "award_categories" ADD COLUMN "allow_dlc_addon" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "award_categories" ADD COLUMN "current_or_previous_year" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "award_categories" SET "allow_dlc_addon" = true WHERE "id" = 'best-expansion-dlc';--> statement-breakpoint
UPDATE "award_categories" SET "current_or_previous_year" = true WHERE "id" IN ('best-ongoing-game', 'most-anticipated-game');
