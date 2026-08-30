ALTER TABLE "communities" ADD COLUMN "invite_code" text;
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "open_invites" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "communities"
SET "invite_code" = replace(replace(upper(substr(replace("id"::text, '-', ''), 1, 10)), '0', '2'), '1', '3')
WHERE "invite_code" IS NULL;
--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "invite_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_invite_code_unique" UNIQUE("invite_code");
