import { and, eq, ilike, isNull, or, sql, type SQLWrapper } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { games, profiles } from "@thegamies/db";
import { integrationDb } from "@/test/integration/db";

const db = integrationDb();

/**
 * Plans the query with sequential scans disabled (one transaction, so the
 * setting stays local). If no index can serve the predicate, Postgres still
 * falls back to a seq scan, so the plan text shows whether an index applies.
 */
async function planWithoutSeqScan(query: SQLWrapper): Promise<string> {
  const [, explain] = await db.batch([
    db.execute(sql`set local enable_seqscan = off`),
    db.execute(sql`explain ${query}`),
  ]);
  return explain.rows.map((row) => String(row["QUERY PLAN"])).join("\n");
}

async function indexNames(table: string): Promise<string[]> {
  const result = await db.execute(
    sql`select indexname from pg_indexes where schemaname = 'public' and tablename = ${table}`,
  );
  return result.rows.map((row) => String(row.indexname));
}

describe("search indexes (integration)", () => {
  it("has trigram indexes on profile display name and username", async () => {
    const names = await indexNames("profiles");
    expect(names).toEqual(
      expect.arrayContaining(["profiles_display_name_trgm_idx", "profiles_username_trgm_idx"]),
    );
  });

  it("has trigram indexes on game title and slug", async () => {
    const names = await indexNames("games");
    expect(names).toEqual(
      expect.arrayContaining(["games_title_trgm_idx", "games_slug_trgm_idx"]),
    );
  });

  it("serves the people-search predicate from both profile indexes", async () => {
    const pattern = "%zelda%";
    const plan = await planWithoutSeqScan(
      db
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(
            isNull(profiles.deletedAt),
            eq(profiles.visibility, "public"),
            or(ilike(profiles.displayName, pattern), ilike(profiles.username, pattern)),
          ),
        ),
    );
    expect(plan).not.toMatch(/Seq Scan/);
    expect(plan).toContain("profiles_display_name_trgm_idx");
    expect(plan).toContain("profiles_username_trgm_idx");
  });

  it("serves the catalog-search predicate from both game indexes", async () => {
    const pattern = "%zelda%";
    const plan = await planWithoutSeqScan(
      db
        .select({ id: games.id })
        .from(games)
        .where(
          and(
            isNull(games.igdbRemovedAt),
            or(ilike(games.title, pattern), ilike(games.slug, pattern)),
          ),
        ),
    );
    expect(plan).not.toMatch(/Seq Scan/);
    expect(plan).toContain("games_title_trgm_idx");
    expect(plan).toContain("games_slug_trgm_idx");
  });
});
