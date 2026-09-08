ALTER TABLE "site_settings" ADD COLUMN "trending_recency_weight_24h" real DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "trending_recency_weight_1_3d" real DEFAULT 0.5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "trending_recency_weight_rest_7d" real DEFAULT 0.25 NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "trending_recency_weight_7_30d" real DEFAULT 0.125 NOT NULL;
