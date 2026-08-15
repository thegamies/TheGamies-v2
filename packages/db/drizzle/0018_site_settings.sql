CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"landing_standings_years" integer[],
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "site_settings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;
