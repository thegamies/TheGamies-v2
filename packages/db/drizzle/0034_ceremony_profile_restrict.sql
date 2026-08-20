-- Comparison and frozen voter lines join these rows by profile_id.
-- CASCADE was wiping Host columns when a profile row was deleted.
ALTER TABLE "community_edition_ballots" DROP CONSTRAINT "community_edition_ballots_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "community_edition_ballots" ADD CONSTRAINT "community_edition_ballots_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_voices" DROP CONSTRAINT "community_edition_voices_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "community_edition_voices" ADD CONSTRAINT "community_edition_voices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voters" DROP CONSTRAINT "community_edition_result_voters_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "community_edition_result_voters" ADD CONSTRAINT "community_edition_result_voters_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_ranks" DROP CONSTRAINT "community_edition_result_voter_ranks_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_ranks" ADD CONSTRAINT "community_edition_result_voter_ranks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" DROP CONSTRAINT "community_edition_result_voter_category_picks_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" ADD CONSTRAINT "community_edition_result_voter_category_picks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
