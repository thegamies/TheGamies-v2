ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "live_rankings_locked" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_live_lock_snapshots" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_live_lock_snapshots_community_id_year_pk" PRIMARY KEY("community_id","year")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_live_lock_snapshots" ADD CONSTRAINT "community_live_lock_snapshots_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
