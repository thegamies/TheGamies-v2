ALTER TABLE "site_settings" ALTER COLUMN "standing_fill_min_visible" SET DEFAULT 2.2;
UPDATE "site_settings" SET "standing_fill_min_visible" = 2.2, "updated_at" = now();
