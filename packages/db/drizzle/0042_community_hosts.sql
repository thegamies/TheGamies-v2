CREATE TABLE "community_hosts" (
	"community_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"promoted_at" timestamp DEFAULT now() NOT NULL,
	"promoted_by_profile_id" uuid,
	"retired_at" timestamp,
	"retired_by_profile_id" uuid,
	CONSTRAINT "community_hosts_community_id_profile_id_pk" PRIMARY KEY("community_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "community_hosts" ADD CONSTRAINT "community_hosts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_hosts" ADD CONSTRAINT "community_hosts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_hosts" ADD CONSTRAINT "community_hosts_promoted_by_profile_id_profiles_id_fk" FOREIGN KEY ("promoted_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_hosts" ADD CONSTRAINT "community_hosts_retired_by_profile_id_profiles_id_fk" FOREIGN KEY ("retired_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_hosts_current_idx" ON "community_hosts" USING btree ("community_id") WHERE "community_hosts"."retired_at" is null;
--> statement-breakpoint
CREATE TABLE "tga_community_hosts" (
	"community_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"designated_at" timestamp DEFAULT now() NOT NULL,
	"designated_by_profile_id" uuid,
	CONSTRAINT "tga_community_hosts_community_id_year_profile_id_pk" PRIMARY KEY("community_id","year","profile_id")
);
--> statement-breakpoint
ALTER TABLE "tga_community_hosts" ADD CONSTRAINT "tga_community_hosts_year_fk" FOREIGN KEY ("community_id","year") REFERENCES "public"."tga_community_years"("community_id","year") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_hosts" ADD CONSTRAINT "tga_community_hosts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tga_community_hosts" ADD CONSTRAINT "tga_community_hosts_designated_by_profile_id_profiles_id_fk" FOREIGN KEY ("designated_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tga_community_hosts_year_idx" ON "tga_community_hosts" USING btree ("community_id","year");
--> statement-breakpoint
INSERT INTO "community_hosts" ("community_id", "profile_id", "promoted_at")
SELECT e."community_id", v."profile_id", MIN(v."designated_at")
FROM "community_edition_voices" v
INNER JOIN "community_editions" e ON e."id" = v."edition_id"
WHERE (
  e."opens_at" IS NULL OR e."closes_at" IS NULL OR e."publishes_at" IS NULL
  OR (CURRENT_TIMESTAMP >= e."opens_at" AND CURRENT_TIMESTAMP < e."closes_at")
)
GROUP BY e."community_id", v."profile_id"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "community_hosts" ("community_id", "profile_id", "promoted_at")
SELECT e."community_id", v."profile_id", MIN(v."designated_at")
FROM "community_edition_voices" v
INNER JOIN "community_editions" e ON e."id" = v."edition_id"
INNER JOIN (
  SELECT "community_id", MAX("year") AS "year"
  FROM "community_editions"
  GROUP BY "community_id"
) latest ON latest."community_id" = e."community_id" AND latest."year" = e."year"
WHERE NOT EXISTS (
  SELECT 1 FROM "community_hosts" h
  WHERE h."community_id" = e."community_id" AND h."retired_at" IS NULL
)
GROUP BY e."community_id", v."profile_id"
ON CONFLICT DO NOTHING;
