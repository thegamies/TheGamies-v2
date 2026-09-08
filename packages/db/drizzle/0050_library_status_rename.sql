UPDATE "library_entries" SET "status" = 'backlog' WHERE "status" = 'want';
--> statement-breakpoint
UPDATE "library_entries" SET "status" = 'beat' WHERE "status" = 'played';
--> statement-breakpoint
UPDATE "activity_events" SET "kind" = 'library_backlog' WHERE "kind" = 'library_want';
--> statement-breakpoint
UPDATE "activity_events" SET "kind" = 'library_beat' WHERE "kind" = 'library_played';
