import { and, asc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { createDb, profiles, type Db } from "@thegamies/db";

export const PEOPLE_SEARCH_LIMIT = 24;

function getDb(): Db {
  return createDb();
}

export type PeopleSearchHit = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function peopleSearchTerm(q: string): string | null {
  const trimmed = q.trim();
  return trimmed.length < 1 ? null : trimmed;
}

/**
 * SQL people search. Blank query returns no hits — never dump the roster.
 * Seed accounts are omitted unless `includeSeed` (operators / debug builds).
 */
export async function searchPeople(
  q: string,
  opts: { excludeProfileId?: string; includeSeed?: boolean } = {},
  db: Db = getDb(),
): Promise<PeopleSearchHit[]> {
  const term = peopleSearchTerm(q);
  if (!term) return [];

  const pattern = `%${term}%`;
  const filters = [
    isNull(profiles.deletedAt),
    eq(profiles.visibility, "public"),
    or(ilike(profiles.displayName, pattern), ilike(profiles.username, pattern)),
  ];
  if (!opts.includeSeed) {
    filters.push(eq(profiles.isSeed, false));
  }
  if (opts.excludeProfileId) {
    filters.push(ne(profiles.id, opts.excludeProfileId));
  }

  const rows = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(and(...filters))
    .orderBy(asc(profiles.displayName), asc(profiles.username))
    .limit(PEOPLE_SEARCH_LIMIT);

  return rows;
}
