ALTER TABLE "lists" ADD COLUMN "list_format" text DEFAULT 'poster' NOT NULL;
--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_list_format_check" CHECK ("list_format" IN ('poster', 'list', 'grid'));
