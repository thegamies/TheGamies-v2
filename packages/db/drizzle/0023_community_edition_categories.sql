CREATE TABLE "community_edition_categories" (
	"edition_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "community_edition_categories_edition_id_category_id_pk" PRIMARY KEY("edition_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "community_edition_categories" ADD CONSTRAINT "community_edition_categories_edition_id_community_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."community_editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_edition_categories" ADD CONSTRAINT "community_edition_categories_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_edition_categories_edition_id_idx" ON "community_edition_categories" USING btree ("edition_id");
--> statement-breakpoint
INSERT INTO "community_edition_categories" ("edition_id", "category_id", "sort_order")
SELECT e."id", c."id", c."sort_order"
FROM "community_editions" e
CROSS JOIN "award_categories" c
WHERE c."active" = true
ON CONFLICT DO NOTHING;
