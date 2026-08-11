CREATE TABLE "award_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_category_votes" (
	"list_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "list_category_votes_list_id_category_id_pk" PRIMARY KEY("list_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "live_category_contrib" (
	"list_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "live_category_contrib_list_id_category_id_pk" PRIMARY KEY("list_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "live_category_dirty" (
	"year" integer NOT NULL,
	"category_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "live_category_dirty_year_category_id_game_id_pk" PRIMARY KEY("year","category_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_category_scores" (
	"year" integer NOT NULL,
	"category_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "live_category_scores_year_category_id_game_id_pk" PRIMARY KEY("year","category_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_goty_contrib" (
	"list_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"rank" integer NOT NULL,
	"points" integer NOT NULL,
	CONSTRAINT "live_goty_contrib_list_id_game_id_pk" PRIMARY KEY("list_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_goty_dirty_games" (
	"year" integer NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "live_goty_dirty_games_year_game_id_pk" PRIMARY KEY("year","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_goty_scores" (
	"year" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"list_mentions" integer DEFAULT 0 NOT NULL,
	"rank_1_count" integer DEFAULT 0 NOT NULL,
	"rank_2_count" integer DEFAULT 0 NOT NULL,
	"rank_3_count" integer DEFAULT 0 NOT NULL,
	"rank_4_count" integer DEFAULT 0 NOT NULL,
	"rank_5_count" integer DEFAULT 0 NOT NULL,
	"rank_6_count" integer DEFAULT 0 NOT NULL,
	"rank_7_count" integer DEFAULT 0 NOT NULL,
	"rank_8_count" integer DEFAULT 0 NOT NULL,
	"rank_9_count" integer DEFAULT 0 NOT NULL,
	"rank_10_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "live_goty_scores_year_game_id_pk" PRIMARY KEY("year","game_id")
);
--> statement-breakpoint
CREATE TABLE "live_goty_year_stats" (
	"year" integer PRIMARY KEY NOT NULL,
	"list_count" integer DEFAULT 0 NOT NULL,
	"detailed_stats_revealed" boolean DEFAULT false NOT NULL,
	"contrib_generation" integer DEFAULT 0 NOT NULL,
	"scores_generation" integer DEFAULT 0 NOT NULL,
	"standings_version" integer DEFAULT 0 NOT NULL,
	"refreshing" boolean DEFAULT false NOT NULL,
	"refresh_started_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "list_category_votes" ADD CONSTRAINT "list_category_votes_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_category_votes" ADD CONSTRAINT "list_category_votes_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_category_votes" ADD CONSTRAINT "list_category_votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_contrib" ADD CONSTRAINT "live_category_contrib_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_contrib" ADD CONSTRAINT "live_category_contrib_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_contrib" ADD CONSTRAINT "live_category_contrib_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_contrib" ADD CONSTRAINT "live_category_contrib_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_dirty" ADD CONSTRAINT "live_category_dirty_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_dirty" ADD CONSTRAINT "live_category_dirty_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_scores" ADD CONSTRAINT "live_category_scores_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_category_scores" ADD CONSTRAINT "live_category_scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_goty_contrib" ADD CONSTRAINT "live_goty_contrib_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_goty_contrib" ADD CONSTRAINT "live_goty_contrib_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_goty_contrib" ADD CONSTRAINT "live_goty_contrib_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_goty_dirty_games" ADD CONSTRAINT "live_goty_dirty_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_goty_scores" ADD CONSTRAINT "live_goty_scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_category_contrib_year_cat_game_idx" ON "live_category_contrib" USING btree ("year","category_id","game_id");--> statement-breakpoint
CREATE INDEX "live_goty_contrib_year_game_idx" ON "live_goty_contrib" USING btree ("year","game_id");--> statement-breakpoint
CREATE INDEX "live_goty_contrib_year_profile_idx" ON "live_goty_contrib" USING btree ("year","profile_id");--> statement-breakpoint
INSERT INTO "award_categories" ("id", "label", "description", "sort_order", "active") VALUES
  ('narrative', 'Best Narrative', 'Story, writing, and narrative design.', 10, true),
  ('art-direction', 'Best Art Direction', 'Visual identity and art direction.', 20, true),
  ('soundtrack', 'Best Soundtrack', 'Music and audio direction.', 30, true),
  ('performance', 'Best Performance', 'Standout character performance.', 40, true),
  ('indie', 'Best Indie', 'Outstanding independent game.', 50, true);