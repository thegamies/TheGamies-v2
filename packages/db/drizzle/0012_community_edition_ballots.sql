CREATE TABLE "community_edition_ballots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_edition_ballot_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ballot_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"blurb" text
);
--> statement-breakpoint
CREATE TABLE "community_edition_ballot_category_votes" (
	"ballot_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "community_edition_ballot_category_votes_ballot_id_category_id_pk" PRIMARY KEY("ballot_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "community_edition_ballots" ADD CONSTRAINT "community_edition_ballots_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballots" ADD CONSTRAINT "community_edition_ballots_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_items" ADD CONSTRAINT "community_edition_ballot_items_ballot_id_community_edition_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."community_edition_ballots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_items" ADD CONSTRAINT "community_edition_ballot_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_category_votes" ADD CONSTRAINT "community_edition_ballot_category_votes_ballot_id_community_edition_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."community_edition_ballots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_category_votes" ADD CONSTRAINT "community_edition_ballot_category_votes_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_category_votes" ADD CONSTRAINT "community_edition_ballot_category_votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_edition_ballots_edition_profile_uidx" ON "community_edition_ballots" USING btree ("edition_id","profile_id");
--> statement-breakpoint
CREATE INDEX "community_edition_ballots_edition_id_idx" ON "community_edition_ballots" USING btree ("edition_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_edition_ballot_items_ballot_rank_uidx" ON "community_edition_ballot_items" USING btree ("ballot_id","rank");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_edition_ballot_items_ballot_game_uidx" ON "community_edition_ballot_items" USING btree ("ballot_id","game_id");
