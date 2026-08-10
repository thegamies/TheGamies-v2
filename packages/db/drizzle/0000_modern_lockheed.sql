CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"synced_at" timestamp,
	CONSTRAINT "companies_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "covers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"image_id" text,
	"url" text,
	"width" integer,
	"height" integer,
	"synced_at" timestamp,
	CONSTRAINT "covers_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_companies" (
	"game_id" uuid NOT NULL,
	"involved_company_igdb_id" integer NOT NULL,
	"company_igdb_id" integer,
	"developer" boolean DEFAULT false NOT NULL,
	"publisher" boolean DEFAULT false NOT NULL,
	"porting" boolean DEFAULT false NOT NULL,
	"supporting" boolean DEFAULT false NOT NULL,
	CONSTRAINT "game_companies_game_id_involved_company_igdb_id_pk" PRIMARY KEY("game_id","involved_company_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_genres" (
	"game_id" uuid NOT NULL,
	"genre_igdb_id" integer NOT NULL,
	CONSTRAINT "game_genres_game_id_genre_igdb_id_pk" PRIMARY KEY("game_id","genre_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_keywords" (
	"game_id" uuid NOT NULL,
	"keyword_igdb_id" integer NOT NULL,
	CONSTRAINT "game_keywords_game_id_keyword_igdb_id_pk" PRIMARY KEY("game_id","keyword_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"game_id" uuid NOT NULL,
	"platform_igdb_id" integer NOT NULL,
	CONSTRAINT "game_platforms_game_id_platform_igdb_id_pk" PRIMARY KEY("game_id","platform_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_themes" (
	"game_id" uuid NOT NULL,
	"theme_igdb_id" integer NOT NULL,
	CONSTRAINT "game_themes_game_id_theme_igdb_id_pk" PRIMARY KEY("game_id","theme_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_time_to_beats" (
	"game_igdb_id" integer PRIMARY KEY NOT NULL,
	"hastily" integer,
	"normally" integer,
	"completely" integer,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "game_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"type" text NOT NULL,
	"synced_at" timestamp,
	CONSTRAINT "game_types_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"year" integer,
	"first_release_date" timestamp,
	"cover_igdb_id" integer,
	"game_type_igdb_id" integer,
	"parent_game_igdb_id" integer,
	"version_parent_igdb_id" integer,
	"is_adult" boolean DEFAULT false NOT NULL,
	"rating" integer,
	"rating_count" integer,
	"follows" integer,
	"hypes" integer,
	"popularity" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"synced_at" timestamp,
	CONSTRAINT "genres_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"synced_at" timestamp,
	CONSTRAINT "keywords_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"abbreviation" text,
	"synced_at" timestamp,
	CONSTRAINT "platforms_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"scope" jsonb,
	"rows_processed" integer DEFAULT 0 NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"last_igdb_id" integer,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"synced_at" timestamp,
	CONSTRAINT "themes_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
ALTER TABLE "game_companies" ADD CONSTRAINT "game_companies_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_keywords" ADD CONSTRAINT "game_keywords_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_themes" ADD CONSTRAINT "game_themes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS games_title_trgm_idx ON games USING gin (title gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS games_year_idx ON games (year);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS games_popularity_idx ON games (popularity DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS games_first_release_date_idx ON games (first_release_date);