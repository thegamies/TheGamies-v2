ALTER TABLE "games" ADD COLUMN "igdb_removed_at" timestamp;
--> statement-breakpoint
CREATE TABLE "igdb_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"received_at" timestamp NOT NULL,
	"processed_at" timestamp,
	"entity" text,
	"method" text,
	"igdb_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"payload" jsonb,
	"queue_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "igdb_webhook_events_status_received_idx" ON "igdb_webhook_events" USING btree ("status","received_at");
--> statement-breakpoint
CREATE INDEX "igdb_webhook_events_received_idx" ON "igdb_webhook_events" USING btree ("received_at");
