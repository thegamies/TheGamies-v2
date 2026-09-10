ALTER TABLE "community_custom_categories" ADD COLUMN "eligibility" text DEFAULT 'current_year' NOT NULL;
--> statement-breakpoint
ALTER TABLE "community_custom_categories" ADD CONSTRAINT "community_custom_categories_eligibility_check" CHECK ("eligibility" IN ('current_year', 'current_or_active', 'active_in_year', 'upcoming', 'any_year'));
