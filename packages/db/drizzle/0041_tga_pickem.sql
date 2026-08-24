CREATE TABLE "tga_years" (
	"year" integer PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"promoted" boolean DEFAULT false NOT NULL,
	"opens_at" timestamp,
	"show_starts_at" timestamp,
	"world_premieres_official" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tga_years_promoted_uidx" ON "tga_years" USING btree ("promoted") WHERE "tga_years"."promoted" = true;
--> statement-breakpoint
CREATE TABLE "tga_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tga_categories" ADD CONSTRAINT "tga_categories_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_categories_year_sort_idx" ON "tga_categories" USING btree ("year","sort_order");
--> statement-breakpoint
CREATE TABLE "tga_nominees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"display_name" text NOT NULL,
	"game_id" uuid,
	"image_url" text
);
--> statement-breakpoint
ALTER TABLE "tga_nominees" ADD CONSTRAINT "tga_nominees_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_nominees" ADD CONSTRAINT "tga_nominees_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_nominees_year_idx" ON "tga_nominees" USING btree ("year");
--> statement-breakpoint
CREATE TABLE "tga_category_nominees" (
	"category_id" uuid NOT NULL,
	"nominee_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tga_category_nominees_category_id_nominee_id_pk" PRIMARY KEY("category_id","nominee_id")
);
--> statement-breakpoint
ALTER TABLE "tga_category_nominees" ADD CONSTRAINT "tga_category_nominees_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_category_nominees" ADD CONSTRAINT "tga_category_nominees_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."tga_nominees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_category_nominees_nominee_idx" ON "tga_category_nominees" USING btree ("nominee_id");
--> statement-breakpoint
CREATE TABLE "tga_winners" (
	"category_id" uuid PRIMARY KEY NOT NULL,
	"nominee_id" uuid NOT NULL,
	"called_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tga_winners" ADD CONSTRAINT "tga_winners_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_winners" ADD CONSTRAINT "tga_winners_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."tga_nominees"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "tga_site_sheets" (
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"world_premieres_guess" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tga_site_sheets_profile_id_year_pk" PRIMARY KEY("profile_id","year")
);
--> statement-breakpoint
ALTER TABLE "tga_site_sheets" ADD CONSTRAINT "tga_site_sheets_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_sheets" ADD CONSTRAINT "tga_site_sheets_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "tga_site_picks" (
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"nominee_id" uuid NOT NULL,
	CONSTRAINT "tga_site_picks_profile_id_year_category_id_pk" PRIMARY KEY("profile_id","year","category_id")
);
--> statement-breakpoint
ALTER TABLE "tga_site_picks" ADD CONSTRAINT "tga_site_picks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_picks" ADD CONSTRAINT "tga_site_picks_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_picks" ADD CONSTRAINT "tga_site_picks_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_picks" ADD CONSTRAINT "tga_site_picks_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."tga_nominees"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_site_picks_category_idx" ON "tga_site_picks" USING btree ("category_id","nominee_id");
--> statement-breakpoint
CREATE TABLE "tga_site_scores" (
	"year" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"wp_delta" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tga_site_scores_year_profile_id_pk" PRIMARY KEY("year","profile_id")
);
--> statement-breakpoint
ALTER TABLE "tga_site_scores" ADD CONSTRAINT "tga_site_scores_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_scores" ADD CONSTRAINT "tga_site_scores_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_site_scores_board_idx" ON "tga_site_scores" USING btree ("year","points","wp_delta");
--> statement-breakpoint
CREATE TABLE "tga_community_years" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	CONSTRAINT "tga_community_years_community_id_year_pk" PRIMARY KEY("community_id","year")
);
--> statement-breakpoint
ALTER TABLE "tga_community_years" ADD CONSTRAINT "tga_community_years_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_years" ADD CONSTRAINT "tga_community_years_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "tga_community_sheets" (
	"community_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"world_premieres_guess" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tga_community_sheets_community_id_profile_id_year_pk" PRIMARY KEY("community_id","profile_id","year")
);
--> statement-breakpoint
ALTER TABLE "tga_community_sheets" ADD CONSTRAINT "tga_community_sheets_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_sheets" ADD CONSTRAINT "tga_community_sheets_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_sheets" ADD CONSTRAINT "tga_community_sheets_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "tga_community_picks" (
	"community_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"nominee_id" uuid NOT NULL,
	CONSTRAINT "tga_community_picks_community_id_profile_id_year_category_id_pk" PRIMARY KEY("community_id","profile_id","year","category_id")
);
--> statement-breakpoint
ALTER TABLE "tga_community_picks" ADD CONSTRAINT "tga_community_picks_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_picks" ADD CONSTRAINT "tga_community_picks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_picks" ADD CONSTRAINT "tga_community_picks_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_picks" ADD CONSTRAINT "tga_community_picks_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_picks" ADD CONSTRAINT "tga_community_picks_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."tga_nominees"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_community_picks_category_idx" ON "tga_community_picks" USING btree ("community_id","category_id","nominee_id");
--> statement-breakpoint
CREATE TABLE "tga_community_scores" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"wp_delta" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tga_community_scores_community_id_year_profile_id_pk" PRIMARY KEY("community_id","year","profile_id")
);
--> statement-breakpoint
ALTER TABLE "tga_community_scores" ADD CONSTRAINT "tga_community_scores_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_scores" ADD CONSTRAINT "tga_community_scores_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "public"."tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_scores" ADD CONSTRAINT "tga_community_scores_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_community_scores_board_idx" ON "tga_community_scores" USING btree ("community_id","year","points","wp_delta");
