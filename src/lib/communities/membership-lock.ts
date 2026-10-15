import { sql, type SQL } from "drizzle-orm";

/**
 * Transaction-scoped lock on one (community, person) pair. Join and ban both
 * take it first in their `db.batch` transaction, so they never interleave.
 */
export function lockCommunityMembershipSql(communityId: string, profileId: string): SQL {
  return sql`SELECT pg_advisory_xact_lock(hashtextextended(${`community-membership:${communityId}:${profileId}`}, 0))`;
}
