ALTER TABLE "communities" ADD COLUMN "social_links" jsonb;

CREATE TABLE IF NOT EXISTS "community_bans" (
  "community_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "banned_by_profile_id" uuid,
  "banned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_bans" ADD CONSTRAINT "community_bans_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_bans" ADD CONSTRAINT "community_bans_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_bans" ADD CONSTRAINT "community_bans_banned_by_profile_id_profiles_id_fk" FOREIGN KEY ("banned_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_bans" ADD CONSTRAINT "community_bans_community_id_profile_id_pk" PRIMARY KEY ("community_id", "profile_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_bans_profile_id_idx" ON "community_bans" USING btree ("profile_id");
