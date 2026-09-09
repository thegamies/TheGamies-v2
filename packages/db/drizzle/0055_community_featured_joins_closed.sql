ALTER TABLE "communities" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "featured_at" timestamp;
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "joins_closed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "communities_featured_at_idx" ON "communities" ("featured_at","name") WHERE "featured" = true;
