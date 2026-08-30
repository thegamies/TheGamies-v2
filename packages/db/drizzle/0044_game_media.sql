ALTER TABLE "covers" ADD COLUMN "alpha_channel" boolean;
ALTER TABLE "covers" ADD COLUMN "animated" boolean;
ALTER TABLE "covers" ADD COLUMN "checksum" text;
ALTER TABLE "covers" ADD COLUMN "game_igdb_id" integer;
ALTER TABLE "covers" ADD COLUMN "game_localization_igdb_id" integer;
ALTER TABLE "covers" ADD COLUMN "image_type_igdb_id" integer;
--> statement-breakpoint
CREATE TABLE "image_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"checksum" text,
	"igdb_created_at" timestamp,
	"igdb_updated_at" timestamp,
	"synced_at" timestamp,
	CONSTRAINT "image_types_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"alpha_channel" boolean,
	"animated" boolean,
	"checksum" text,
	"game_igdb_id" integer,
	"height" integer,
	"image_id" text,
	"image_type_igdb_id" integer,
	"url" text,
	"width" integer,
	"synced_at" timestamp,
	CONSTRAINT "artworks_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"alpha_channel" boolean,
	"animated" boolean,
	"checksum" text,
	"game_igdb_id" integer,
	"height" integer,
	"image_id" text,
	"url" text,
	"width" integer,
	"synced_at" timestamp,
	CONSTRAINT "screenshots_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"checksum" text,
	"game_igdb_id" integer,
	"name" text,
	"video_id" text,
	"synced_at" timestamp,
	CONSTRAINT "game_videos_igdb_id_unique" UNIQUE("igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_artworks" (
	"game_id" uuid NOT NULL,
	"artwork_igdb_id" integer NOT NULL,
	CONSTRAINT "game_artworks_game_id_artwork_igdb_id_pk" PRIMARY KEY("game_id","artwork_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_screenshots" (
	"game_id" uuid NOT NULL,
	"screenshot_igdb_id" integer NOT NULL,
	CONSTRAINT "game_screenshots_game_id_screenshot_igdb_id_pk" PRIMARY KEY("game_id","screenshot_igdb_id")
);
--> statement-breakpoint
CREATE TABLE "game_video_links" (
	"game_id" uuid NOT NULL,
	"video_igdb_id" integer NOT NULL,
	CONSTRAINT "game_video_links_game_id_video_igdb_id_pk" PRIMARY KEY("game_id","video_igdb_id")
);
--> statement-breakpoint
ALTER TABLE "game_artworks" ADD CONSTRAINT "game_artworks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_screenshots" ADD CONSTRAINT "game_screenshots_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_video_links" ADD CONSTRAINT "game_video_links_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "artworks_game_igdb_id_idx" ON "artworks" USING btree ("game_igdb_id");
--> statement-breakpoint
CREATE INDEX "screenshots_game_igdb_id_idx" ON "screenshots" USING btree ("game_igdb_id");
--> statement-breakpoint
CREATE INDEX "game_videos_game_igdb_id_idx" ON "game_videos" USING btree ("game_igdb_id");
