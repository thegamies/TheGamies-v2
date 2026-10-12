INSERT INTO "tga_site_scores" ("year", "profile_id", "points", "wp_delta", "updated_at")
SELECT
  s.year,
  s.profile_id,
  coalesce(m.points, 0),
  CASE
    WHEN y.world_premieres_official IS NULL OR s.world_premieres_guess IS NULL THEN NULL
    ELSE abs(s.world_premieres_guess - y.world_premieres_official)
  END,
  now()
FROM "tga_site_sheets" s
JOIN "tga_years" y ON y.year = s.year
LEFT JOIN (
  SELECT p.year, p.profile_id, count(*)::int AS points
  FROM "tga_site_picks" p
  JOIN "tga_winners" w
    ON w.category_id = p.category_id
   AND w.nominee_id = p.nominee_id
  GROUP BY p.year, p.profile_id
) m ON m.year = s.year AND m.profile_id = s.profile_id
ON CONFLICT ("year", "profile_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tga_community_scores" ("community_id", "year", "profile_id", "points", "wp_delta", "updated_at")
SELECT
  s.community_id,
  s.year,
  s.profile_id,
  coalesce(m.points, 0),
  CASE
    WHEN y.world_premieres_official IS NULL OR s.world_premieres_guess IS NULL THEN NULL
    ELSE abs(s.world_premieres_guess - y.world_premieres_official)
  END,
  now()
FROM "tga_community_sheets" s
JOIN "tga_years" y ON y.year = s.year
LEFT JOIN (
  SELECT p.community_id, p.year, p.profile_id, count(*)::int AS points
  FROM "tga_community_picks" p
  JOIN "tga_winners" w
    ON w.category_id = p.category_id
   AND w.nominee_id = p.nominee_id
  GROUP BY p.community_id, p.year, p.profile_id
) m ON m.community_id = s.community_id AND m.year = s.year AND m.profile_id = s.profile_id
ON CONFLICT ("community_id", "year", "profile_id") DO NOTHING;
