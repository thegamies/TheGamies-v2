CREATE INDEX IF NOT EXISTS "tga_community_picks_nominee_idx" ON "tga_community_picks" USING btree ("year","category_id","nominee_id","community_id","profile_id");
