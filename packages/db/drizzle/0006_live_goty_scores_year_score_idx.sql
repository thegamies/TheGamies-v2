CREATE INDEX IF NOT EXISTS "live_goty_scores_year_score_idx" ON "live_goty_scores" USING btree ("year","score" DESC,"game_id");
