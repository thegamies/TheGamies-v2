CREATE TABLE "community_custom_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"answer_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_custom_categories" ADD CONSTRAINT "community_custom_categories_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_custom_categories_edition_sort_idx" ON "community_custom_categories" USING btree ("edition_id","sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_custom_categories_edition_name_uidx" ON "community_custom_categories" USING btree ("edition_id", lower("name"));
--> statement-breakpoint
CREATE TABLE "community_custom_category_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"game_id" uuid,
	"description" text,
	"image_url" text,
	"support_link_url" text,
	"support_link_kind" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"entry_source" text DEFAULT 'host' NOT NULL,
	"nomination_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_custom_category_entries" ADD CONSTRAINT "community_custom_category_entries_category_id_community_custom_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."community_custom_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_custom_category_entries" ADD CONSTRAINT "community_custom_category_entries_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_custom_category_entries_category_sort_idx" ON "community_custom_category_entries" USING btree ("category_id","sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_custom_category_entries_title_uidx" ON "community_custom_category_entries" USING btree ("category_id", lower("title"));
--> statement-breakpoint
CREATE TABLE "community_edition_ballot_custom_category_votes" (
	"ballot_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"game_id" uuid,
	"entry_id" uuid,
	CONSTRAINT "community_edition_ballot_custom_category_votes_ballot_id_category_id_pk" PRIMARY KEY("ballot_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_custom_category_votes" ADD CONSTRAINT "community_edition_ballot_custom_category_votes_ballot_id_community_edition_ballots_id_fk" FOREIGN KEY ("ballot_id") REFERENCES "public"."community_edition_ballots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_custom_category_votes" ADD CONSTRAINT "community_edition_ballot_custom_category_votes_category_id_community_custom_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."community_custom_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_custom_category_votes" ADD CONSTRAINT "community_edition_ballot_custom_category_votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_ballot_custom_category_votes" ADD CONSTRAINT "community_edition_ballot_custom_category_votes_entry_id_community_custom_category_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."community_custom_category_entries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_edition_ballot_custom_votes_entry_idx" ON "community_edition_ballot_custom_category_votes" USING btree ("entry_id");
--> statement-breakpoint
CREATE TABLE "community_edition_result_custom_categories" (
	"edition_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"category_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"answer_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"place" integer NOT NULL,
	"entry_id" uuid,
	"game_id" uuid,
	"slug" text,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text,
	"cover_url" text,
	"support_link_url" text,
	"support_link_kind" text,
	"votes" integer NOT NULL,
	CONSTRAINT "community_edition_result_custom_categories_edition_id_mode_category_id_place_pk" PRIMARY KEY("edition_id","mode","category_id","place")
);
--> statement-breakpoint
ALTER TABLE "community_edition_result_custom_categories" ADD CONSTRAINT "community_edition_result_custom_categories_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_custom_categories" ADD CONSTRAINT "community_edition_result_custom_categories_category_id_community_custom_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."community_custom_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_result_custom_categories" ADD CONSTRAINT "community_edition_result_custom_categories_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_edition_result_custom_categories_idx" ON "community_edition_result_custom_categories" USING btree ("edition_id","mode","category_id");
