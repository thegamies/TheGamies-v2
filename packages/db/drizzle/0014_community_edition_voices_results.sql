CREATE TABLE "community_edition_voices" (
	"edition_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"designated_at" timestamp DEFAULT now() NOT NULL,
	"designated_by_profile_id" uuid,
	CONSTRAINT "community_edition_voices_edition_id_profile_id_pk" PRIMARY KEY("edition_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_meta" (
	"edition_id" uuid PRIMARY KEY NOT NULL,
	"frozen_at" timestamp DEFAULT now() NOT NULL,
	"ballot_count_community" integer DEFAULT 0 NOT NULL,
	"ballot_count_voices" integer DEFAULT 0 NOT NULL,
	"goty_total_community" integer DEFAULT 0 NOT NULL,
	"goty_total_voices" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_goty" (
	"edition_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"place" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"game_year" integer,
	"cover_url" text,
	"points" integer NOT NULL,
	"first_place_votes" integer DEFAULT 0 NOT NULL,
	"appearances" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "community_edition_result_goty_edition_id_mode_place_pk" PRIMARY KEY("edition_id","mode","place")
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_categories" (
	"edition_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"place" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"votes" integer NOT NULL,
	CONSTRAINT "community_edition_result_categories_edition_id_mode_category_id_place_pk" PRIMARY KEY("edition_id","mode","category_id","place")
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_voters" (
	"edition_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"is_voice" boolean DEFAULT false NOT NULL,
	"display_name" text NOT NULL,
	"username" text NOT NULL,
	CONSTRAINT "community_edition_result_voters_edition_id_profile_id_pk" PRIMARY KEY("edition_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_voter_ranks" (
	"edition_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	CONSTRAINT "community_edition_result_voter_ranks_edition_id_profile_id_rank_pk" PRIMARY KEY("edition_id","profile_id","rank")
);
--> statement-breakpoint
CREATE TABLE "community_edition_result_voter_category_picks" (
	"edition_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	CONSTRAINT "community_edition_result_voter_category_picks_edition_id_profile_id_category_id_pk" PRIMARY KEY("edition_id","profile_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "community_edition_voices" ADD CONSTRAINT "community_edition_voices_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_voices" ADD CONSTRAINT "community_edition_voices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_voices" ADD CONSTRAINT "community_edition_voices_designated_by_profile_id_profiles_id_fk" FOREIGN KEY ("designated_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_meta" ADD CONSTRAINT "community_edition_result_meta_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_goty" ADD CONSTRAINT "community_edition_result_goty_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_goty" ADD CONSTRAINT "community_edition_result_goty_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_categories" ADD CONSTRAINT "community_edition_result_categories_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_categories" ADD CONSTRAINT "community_edition_result_categories_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_categories" ADD CONSTRAINT "community_edition_result_categories_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voters" ADD CONSTRAINT "community_edition_result_voters_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voters" ADD CONSTRAINT "community_edition_result_voters_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_ranks" ADD CONSTRAINT "community_edition_result_voter_ranks_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_ranks" ADD CONSTRAINT "community_edition_result_voter_ranks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_ranks" ADD CONSTRAINT "community_edition_result_voter_ranks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" ADD CONSTRAINT "community_edition_result_voter_category_picks_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" ADD CONSTRAINT "community_edition_result_voter_category_picks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" ADD CONSTRAINT "community_edition_result_voter_category_picks_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_voter_category_picks" ADD CONSTRAINT "community_edition_result_voter_category_picks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_edition_voices_edition_id_idx" ON "community_edition_voices" USING btree ("edition_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_edition_result_goty_game_uidx" ON "community_edition_result_goty" USING btree ("edition_id","mode","game_id");
--> statement-breakpoint
CREATE INDEX "community_edition_result_goty_page_idx" ON "community_edition_result_goty" USING btree ("edition_id","mode","place");
--> statement-breakpoint
CREATE INDEX "community_edition_result_categories_idx" ON "community_edition_result_categories" USING btree ("edition_id","mode","category_id");
--> statement-breakpoint
CREATE INDEX "community_edition_result_voters_name_idx" ON "community_edition_result_voters" USING btree ("edition_id","display_name");
--> statement-breakpoint
CREATE INDEX "community_edition_result_voter_ranks_voter_idx" ON "community_edition_result_voter_ranks" USING btree ("edition_id","profile_id");
