ALTER TABLE "community_editions" ADD COLUMN "freeze_status" text DEFAULT 'idle' NOT NULL;
--> statement-breakpoint
ALTER TABLE "community_editions" ADD COLUMN "freeze_started_at" timestamp;
--> statement-breakpoint
ALTER TABLE "community_editions" ADD COLUMN "freeze_error" text;
--> statement-breakpoint
ALTER TABLE "community_editions" ADD CONSTRAINT "community_editions_freeze_status_check" CHECK ("freeze_status" IN ('idle', 'pending', 'computing', 'ready', 'failed'));
--> statement-breakpoint
CREATE INDEX "community_editions_freeze_status_idx" ON "community_editions" USING btree ("freeze_status");
--> statement-breakpoint
UPDATE "community_editions" e
SET "freeze_status" = 'ready'
WHERE EXISTS (
  SELECT 1 FROM "community_edition_result_meta" m WHERE m."edition_id" = e."id"
);
