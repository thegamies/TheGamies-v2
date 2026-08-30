-- Drop ephemeral JSONB lock blobs (safe: unlock/re-lock rebuilds freeze).
DROP TABLE IF EXISTS "community_live_lock_snapshots";
--> statement-breakpoint
CREATE TABLE "community_live_lock_meta" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"list_count" integer DEFAULT 0 NOT NULL,
	"goty_total" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_live_lock_meta_community_id_year_pk" PRIMARY KEY("community_id","year")
);
--> statement-breakpoint
CREATE TABLE "community_live_lock_goty" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"place" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"game_year" integer,
	"cover_url" text,
	"score" integer NOT NULL,
	"list_mentions" integer NOT NULL,
	CONSTRAINT "community_live_lock_goty_community_id_year_place_pk" PRIMARY KEY("community_id","year","place")
);
--> statement-breakpoint
CREATE TABLE "community_live_lock_category_rows" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"place" integer NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"vote_count" integer NOT NULL,
	CONSTRAINT "community_live_lock_category_rows_community_id_year_category_id_place_pk" PRIMARY KEY("community_id","year","category_id","place")
);
--> statement-breakpoint
ALTER TABLE "community_live_lock_meta" ADD CONSTRAINT "community_live_lock_meta_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_live_lock_goty" ADD CONSTRAINT "community_live_lock_goty_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_live_lock_goty" ADD CONSTRAINT "community_live_lock_goty_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_live_lock_category_rows" ADD CONSTRAINT "community_live_lock_category_rows_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_live_lock_category_rows" ADD CONSTRAINT "community_live_lock_category_rows_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_live_lock_goty_page_idx" ON "community_live_lock_goty" USING btree ("community_id","year","place");
--> statement-breakpoint
CREATE INDEX "community_live_lock_category_rows_idx" ON "community_live_lock_category_rows" USING btree ("community_id","year","category_id");
