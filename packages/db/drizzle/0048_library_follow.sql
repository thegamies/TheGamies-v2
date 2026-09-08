ALTER TABLE "lists" ADD COLUMN "rank_visibility" text DEFAULT 'ranked' NOT NULL;
--> statement-breakpoint
CREATE TABLE "library_entries" (
	"profile_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"status" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_entries_profile_id_game_id_pk" PRIMARY KEY("profile_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "profile_follows" (
	"follower_profile_id" uuid NOT NULL,
	"followed_profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_follows_follower_profile_id_followed_profile_id_pk" PRIMARY KEY("follower_profile_id","followed_profile_id")
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"game_id" uuid,
	"kind" text NOT NULL,
	"list_id" uuid,
	"batch_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "public_trending_min_people" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_follows" ADD CONSTRAINT "profile_follows_follower_profile_id_profiles_id_fk" FOREIGN KEY ("follower_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_follows" ADD CONSTRAINT "profile_follows_followed_profile_id_profiles_id_fk" FOREIGN KEY ("followed_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "library_entries_status_game_idx" ON "library_entries" USING btree ("status","game_id");
--> statement-breakpoint
CREATE INDEX "library_entries_profile_updated_idx" ON "library_entries" USING btree ("profile_id","updated_at");
--> statement-breakpoint
CREATE INDEX "profile_follows_followed_idx" ON "profile_follows" USING btree ("followed_profile_id","created_at");
--> statement-breakpoint
CREATE INDEX "profile_follows_follower_idx" ON "profile_follows" USING btree ("follower_profile_id","created_at");
--> statement-breakpoint
CREATE INDEX "activity_events_created_idx" ON "activity_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "activity_events_profile_created_idx" ON "activity_events" USING btree ("profile_id","created_at");
--> statement-breakpoint
CREATE INDEX "activity_events_game_created_idx" ON "activity_events" USING btree ("game_id","created_at");
--> statement-breakpoint
CREATE INDEX "activity_events_batch_idx" ON "activity_events" USING btree ("batch_id");
