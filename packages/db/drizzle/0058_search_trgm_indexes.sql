CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_display_name_trgm_idx" ON "profiles" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_username_trgm_idx" ON "profiles" USING gin ("username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_slug_trgm_idx" ON "games" USING gin ("slug" gin_trgm_ops);
