ALTER TABLE "tga_years" ADD COLUMN "category_slot_high" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tga_categories" ADD COLUMN "slot" integer;
--> statement-breakpoint
ALTER TABLE "tga_categories" ADD COLUMN "nominee_slot_high" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY year ORDER BY sort_order, label, id) AS slot
  FROM tga_categories
)
UPDATE tga_categories AS c
SET slot = numbered.slot
FROM numbered
WHERE c.id = numbered.id;
--> statement-breakpoint
ALTER TABLE "tga_categories" ALTER COLUMN "slot" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tga_categories" ADD CONSTRAINT "tga_categories_slot_range" CHECK ("slot" BETWEEN 1 AND 255);
--> statement-breakpoint
CREATE UNIQUE INDEX "tga_categories_year_slot_uidx" ON "tga_categories" ("year", "slot");
--> statement-breakpoint
UPDATE tga_years AS y
SET category_slot_high = COALESCE((
  SELECT max(c.slot) FROM tga_categories AS c WHERE c.year = y.year
), 0);
--> statement-breakpoint
ALTER TABLE "tga_category_nominees" ADD COLUMN "slot" integer;
--> statement-breakpoint
WITH numbered AS (
  SELECT
    category_id,
    nominee_id,
    row_number() OVER (PARTITION BY category_id ORDER BY sort_order, nominee_id) AS slot
  FROM tga_category_nominees
)
UPDATE tga_category_nominees AS cn
SET slot = numbered.slot
FROM numbered
WHERE cn.category_id = numbered.category_id
  AND cn.nominee_id = numbered.nominee_id;
--> statement-breakpoint
ALTER TABLE "tga_category_nominees" ALTER COLUMN "slot" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tga_category_nominees" ADD CONSTRAINT "tga_category_nominees_slot_range" CHECK ("slot" BETWEEN 1 AND 255);
--> statement-breakpoint
CREATE UNIQUE INDEX "tga_category_nominees_slot_uidx" ON "tga_category_nominees" ("category_id", "slot");
--> statement-breakpoint
UPDATE tga_categories AS c
SET nominee_slot_high = COALESCE((
  SELECT max(cn.slot) FROM tga_category_nominees AS cn WHERE cn.category_id = c.id
), 0);
--> statement-breakpoint
ALTER TABLE "tga_site_sheets" ADD COLUMN "ballot_mask" bytea;
--> statement-breakpoint
ALTER TABLE "tga_community_sheets" ADD COLUMN "ballot_mask" bytea;
--> statement-breakpoint
UPDATE tga_site_sheets AS s
SET ballot_mask = (
  SELECT decode(
    string_agg(lpad(to_hex(COALESCE(cn.slot, 0)), 2, '0'), '' ORDER BY g.i),
    'hex'
  )
  FROM generate_series(
    0,
    (SELECT COALESCE(max(c.slot), 0) FROM tga_categories AS c WHERE c.year = s.year)
  ) AS g(i)
  LEFT JOIN tga_categories AS c ON c.year = s.year AND c.slot = g.i
  LEFT JOIN tga_site_picks AS p
    ON p.year = s.year
   AND p.profile_id = s.profile_id
   AND p.category_id = c.id
  LEFT JOIN tga_category_nominees AS cn
    ON cn.category_id = c.id
   AND cn.nominee_id = p.nominee_id
);
--> statement-breakpoint
UPDATE tga_community_sheets AS s
SET ballot_mask = (
  SELECT decode(
    string_agg(lpad(to_hex(COALESCE(cn.slot, 0)), 2, '0'), '' ORDER BY g.i),
    'hex'
  )
  FROM generate_series(
    0,
    (SELECT COALESCE(max(c.slot), 0) FROM tga_categories AS c WHERE c.year = s.year)
  ) AS g(i)
  LEFT JOIN tga_categories AS c ON c.year = s.year AND c.slot = g.i
  LEFT JOIN tga_community_picks AS p
    ON p.community_id = s.community_id
   AND p.year = s.year
   AND p.profile_id = s.profile_id
   AND p.category_id = c.id
  LEFT JOIN tga_category_nominees AS cn
    ON cn.category_id = c.id
   AND cn.nominee_id = p.nominee_id
);
--> statement-breakpoint
CREATE TABLE "tga_site_pick_counts" (
  "year" integer NOT NULL,
  "category_id" uuid NOT NULL,
  "nominee_id" uuid NOT NULL,
  "picks" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "tga_site_pick_counts_year_category_id_nominee_id_pk" PRIMARY KEY ("year", "category_id", "nominee_id")
);
--> statement-breakpoint
ALTER TABLE "tga_site_pick_counts" ADD CONSTRAINT "tga_site_pick_counts_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_pick_counts" ADD CONSTRAINT "tga_site_pick_counts_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_site_pick_counts" ADD CONSTRAINT "tga_site_pick_counts_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "tga_nominees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "tga_community_pick_counts" (
  "community_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "category_id" uuid NOT NULL,
  "nominee_id" uuid NOT NULL,
  "picks" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "tga_community_pick_counts_community_id_year_category_id_nominee_id_pk" PRIMARY KEY ("community_id", "year", "category_id", "nominee_id")
);
--> statement-breakpoint
ALTER TABLE "tga_community_pick_counts" ADD CONSTRAINT "tga_community_pick_counts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_pick_counts" ADD CONSTRAINT "tga_community_pick_counts_year_tga_years_year_fk" FOREIGN KEY ("year") REFERENCES "tga_years"("year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_pick_counts" ADD CONSTRAINT "tga_community_pick_counts_category_id_tga_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "tga_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_pick_counts" ADD CONSTRAINT "tga_community_pick_counts_nominee_id_tga_nominees_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "tga_nominees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "tga_site_pick_counts" ("year", "category_id", "nominee_id", "picks")
SELECT year, category_id, nominee_id, count(*)::int
FROM tga_site_picks
GROUP BY year, category_id, nominee_id;
--> statement-breakpoint
INSERT INTO "tga_community_pick_counts" ("community_id", "year", "category_id", "nominee_id", "picks")
SELECT community_id, year, category_id, nominee_id, count(*)::int
FROM tga_community_picks
GROUP BY community_id, year, category_id, nominee_id;
--> statement-breakpoint
ALTER TABLE "tga_site_scores" ADD COLUMN "place" integer;
--> statement-breakpoint
ALTER TABLE "tga_community_scores" ADD COLUMN "place" integer;
--> statement-breakpoint
UPDATE tga_site_scores AS sc
SET place = ranked.place
FROM (
  SELECT
    year,
    profile_id,
    rank() OVER (
      PARTITION BY year
      ORDER BY points DESC, wp_delta ASC NULLS LAST
    ) AS place
  FROM tga_site_scores
) AS ranked
WHERE sc.year = ranked.year AND sc.profile_id = ranked.profile_id;
--> statement-breakpoint
UPDATE tga_community_scores AS sc
SET place = ranked.place
FROM (
  SELECT
    community_id,
    year,
    profile_id,
    rank() OVER (
      PARTITION BY community_id, year
      ORDER BY points DESC, wp_delta ASC NULLS LAST
    ) AS place
  FROM tga_community_scores
) AS ranked
WHERE sc.community_id = ranked.community_id
  AND sc.year = ranked.year
  AND sc.profile_id = ranked.profile_id;
--> statement-breakpoint
DROP INDEX IF EXISTS "tga_site_scores_board_idx";
--> statement-breakpoint
CREATE INDEX "tga_site_scores_board_idx" ON "tga_site_scores" ("year", "place");
--> statement-breakpoint
DROP INDEX IF EXISTS "tga_community_scores_board_idx";
--> statement-breakpoint
CREATE INDEX "tga_community_scores_board_idx" ON "tga_community_scores" ("community_id", "year", "place");
