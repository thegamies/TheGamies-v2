ALTER TABLE "community_editions" ALTER COLUMN "opens_at" TYPE timestamptz USING "opens_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "community_editions" ALTER COLUMN "closes_at" TYPE timestamptz USING "closes_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "community_editions" ALTER COLUMN "publishes_at" TYPE timestamptz USING "publishes_at" AT TIME ZONE 'UTC';
