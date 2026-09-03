ALTER TABLE "profiles" ADD COLUMN "is_seed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "profiles" SET "is_seed" = true WHERE "auth_user_id" LIKE 'seed:%';
--> statement-breakpoint
CREATE INDEX "profiles_is_seed_true_idx" ON "profiles" ("id") WHERE "is_seed";
