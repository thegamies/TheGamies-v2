CREATE TABLE "list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"rank" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"edit_secret_hash" text,
	"profile_id" uuid,
	"list_type" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"slug" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lists_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_rank_uidx" ON "list_items" USING btree ("list_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_game_uidx" ON "list_items" USING btree ("list_id","game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_owned_goty_year_uidx" ON "lists" USING btree ("profile_id","year") WHERE "lists"."list_type" = 'goty' AND "lists"."profile_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "lists_profile_slug_uidx" ON "lists" USING btree ("profile_id","slug") WHERE "lists"."profile_id" IS NOT NULL AND "lists"."slug" IS NOT NULL;