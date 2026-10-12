import { sql } from "drizzle-orm";
import { createDb, type Db } from "@thegamies/db";

export const ADMIN_COMMUNITY_STATS_PAGE_SIZE = 25;
export const ADMIN_COMMUNITY_STATS_SEARCH_LIMIT = 50;
export const ADMIN_COMMUNITY_STATS_Q_MAX = 64;

export type CommunityStatsRow = {
  id: string;
  slug: string;
  name: string;
  members: number;
  pickemEnabled: boolean;
  pickemYears: number;
  pickemSheets: number;
  editions: number;
  ballots: number;
  editionEntries: number;
};

export function parseAdminCommunityStatsQuery(input: {
  q?: string;
  page?: number;
}): { q: string; page: number; limit: number; offset: number } {
  const q = (input.q ?? "").trim().slice(0, ADMIN_COMMUNITY_STATS_Q_MAX);
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = q ? ADMIN_COMMUNITY_STATS_SEARCH_LIMIT : ADMIN_COMMUNITY_STATS_PAGE_SIZE;
  const offset = (page - 1) * limit;
  return { q, page, limit, offset };
}

function asInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function listCommunityStatsForAdmin(
  opts: { q?: string; page?: number } = {},
  db: Db = createDb(),
): Promise<{ rows: CommunityStatsRow[]; total: number; page: number }> {
  const parsed = parseAdminCommunityStatsQuery(opts);
  const term = parsed.q ? `%${parsed.q}%` : null;
  const where = term
    ? sql`(name ilike ${term} or slug ilike ${term})`
    : sql`true`;
  const [totalRow] = (
    await db.execute(sql`
      select count(*)::int as n
      from communities
      where ${where}
    `)
  ).rows as Array<{ n: unknown }>;

  const result = await db.execute(sql`
    with page as (
      select id, slug, name
      from communities
      where ${where}
      order by name, slug
      limit ${parsed.limit}
      offset ${parsed.offset}
    )
    select
      p.id,
      p.slug,
      p.name,
      (select count(*)::int from community_members m where m.community_id = p.id) as members,
      (select count(*)::int from tga_community_years y where y.community_id = p.id) as pickem_years,
      (select count(*)::int from tga_community_sheets s where s.community_id = p.id) as pickem_sheets,
      (select count(*)::int from community_editions e where e.community_id = p.id) as editions,
      (
        select count(*)::int
        from community_edition_ballots b
        inner join community_editions e on e.id = b.edition_id
        where e.community_id = p.id
      ) as ballots,
      (
        select count(*)::int
        from community_edition_ballot_items i
        inner join community_edition_ballots b on b.id = i.ballot_id
        inner join community_editions e on e.id = b.edition_id
        where e.community_id = p.id
      ) as edition_entries
    from page p
  `);

  const rows = (
    result.rows as Array<{
      id: unknown;
      slug: unknown;
      name: unknown;
      members: unknown;
      pickem_years: unknown;
      pickem_sheets: unknown;
      editions: unknown;
      ballots: unknown;
      edition_entries: unknown;
    }>
  ).map((row) => {
    const pickemYears = asInt(row.pickem_years);
    return {
      id: typeof row.id === "string" ? row.id : "",
      slug: typeof row.slug === "string" ? row.slug : "",
      name: typeof row.name === "string" ? row.name : "",
      members: asInt(row.members),
      pickemEnabled: pickemYears > 0,
      pickemYears,
      pickemSheets: asInt(row.pickem_sheets),
      editions: asInt(row.editions),
      ballots: asInt(row.ballots),
      editionEntries: asInt(row.edition_entries),
    };
  });

  return {
    rows,
    total: asInt(totalRow?.n),
    page: parsed.page,
  };
}
