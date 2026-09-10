ALTER TABLE "community_edition_ballots" ADD COLUMN IF NOT EXISTS "list_copy_prompted_at" timestamp;
ALTER TABLE "community_members" DROP COLUMN IF EXISTS "ballot_copy_prompted_at";
