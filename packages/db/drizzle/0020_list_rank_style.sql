ALTER TABLE "lists" ADD COLUMN "rank_style" text DEFAULT 'chip' NOT NULL;
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "show_suffix" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_rank_style_check" CHECK ("rank_style" IN ('banner', 'chip', 'off'));
