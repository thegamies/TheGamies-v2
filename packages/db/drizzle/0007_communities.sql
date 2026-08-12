CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by_profile_id" uuid,
	"live_rankings_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"community_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_community_id_profile_id_pk" PRIMARY KEY("community_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_profile_id_profiles_id_fk" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_members_profile_id_idx" ON "community_members" USING btree ("profile_id");
