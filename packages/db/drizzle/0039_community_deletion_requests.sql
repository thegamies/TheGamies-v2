CREATE TABLE IF NOT EXISTS "community_deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "community_id" uuid NOT NULL,
  "requested_by_profile_id" uuid,
  "status" text DEFAULT 'pending' NOT NULL,
  "requested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_deletion_requests" ADD CONSTRAINT "community_deletion_requests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_deletion_requests" ADD CONSTRAINT "community_deletion_requests_requested_by_profile_id_profiles_id_fk" FOREIGN KEY ("requested_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_deletion_requests_pending_community_uidx" ON "community_deletion_requests" USING btree ("community_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_deletion_requests_status_idx" ON "community_deletion_requests" USING btree ("status");
