ALTER TABLE "communities" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communities_visibility_name_idx" ON "communities" USING btree ("visibility","name");
