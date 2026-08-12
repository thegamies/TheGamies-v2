CREATE TABLE "community_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"opens_at" timestamp,
	"closes_at" timestamp,
	"publishes_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_editions" ADD CONSTRAINT "community_editions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_editions_community_id_year_uidx" ON "community_editions" USING btree ("community_id","year");
--> statement-breakpoint
CREATE INDEX "community_editions_community_id_idx" ON "community_editions" USING btree ("community_id");
