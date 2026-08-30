/**
 * Seeded-year EXPLAIN for the site live standings bundle.
 * Usage: doppler run --config dev_personal -- node scripts/explain-live-standings.mjs
 * Does not print DATABASE_URL.
 */
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(databaseUrl);
const pageSize = 50;
const label = process.argv[2] === "after" ? "after" : "before";

function bundleSql(year, requestedPage) {
  const higherCount =
    label === "after"
      ? `
      (
        select count(*)::int
        from live_goty_scores hs
        where hs.year = ${year}
          and hs.score > (
            select s0.score
            from live_goty_scores s0
            where s0.year = ${year}
            order by s0.score desc, s0.game_id asc
            offset (b.page - 1) * ${pageSize}
            limit 1
          )
      ) as higher_count,`
      : "";
  return `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    with meta as (
      select
        coalesce(ys.list_count, 0)::int as list_count,
        coalesce(ys.detailed_stats_revealed, false) as detailed_stats_revealed,
        coalesce(ys.contrib_generation, 0)::int as contrib_generation,
        coalesce(ys.scores_generation, 0)::int as scores_generation,
        coalesce(ys.standings_version, 0)::int as standings_version,
        (
          select count(*)::int
          from live_goty_scores
          where year = ${year}
        ) as goty_total
      from (select ${year}::int as year) y
      left join live_goty_year_stats ys on ys.year = y.year
    ),
    bounds as (
      select
        meta.*,
        greatest(
          1,
          ceil(meta.goty_total::numeric / ${pageSize}::numeric)
        )::int as total_pages,
        least(
          greatest(${requestedPage}::int, 1),
          greatest(
            1,
            ceil(meta.goty_total::numeric / ${pageSize}::numeric)
          )::int
        ) as page
      from meta
    )
    select
      b.list_count,
      b.detailed_stats_revealed,
      b.contrib_generation,
      b.scores_generation,
      b.standings_version,
      b.goty_total,
      b.page,
      b.total_pages,
      ${higherCount}
      coalesce(
        (
          select json_agg(row_to_json(p) order by p."place")
          from (
            select
              ((b.page - 1) * ${pageSize} + row_number() over (
                order by s.score desc, s.game_id asc
              ))::int as "place",
              s.game_id as "gameId",
              g.slug as "slug",
              g.title as "title",
              g.year as "year",
              c.image_id as "coverImageId",
              s.score as "score",
              s.list_mentions as "listMentions",
              s.rank_1_count as "rank1Count",
              s.rank_2_count as "rank2Count",
              s.rank_3_count as "rank3Count",
              s.rank_4_count as "rank4Count",
              s.rank_5_count as "rank5Count",
              s.rank_6_count as "rank6Count",
              s.rank_7_count as "rank7Count",
              s.rank_8_count as "rank8Count",
              s.rank_9_count as "rank9Count",
              s.rank_10_count as "rank10Count"
            from live_goty_scores s
            inner join games g on g.id = s.game_id
            left join covers c on c.igdb_id = g.cover_igdb_id
            where s.year = ${year}
            order by s.score desc, s.game_id asc
            limit ${pageSize}
            offset (b.page - 1) * ${pageSize}
          ) p
        ),
        '[]'::json
      ) as goty,
      coalesce(
        (
          select json_agg(row_to_json(cat) order by cat."sortOrder", cat."label", cat."place" nulls last)
          from (
            select
              ac.id as "categoryId",
              ac.label as "label",
              ac.description as "description",
              ac.sort_order as "sortOrder",
              r.place as "place",
              r.game_id as "gameId",
              r.slug as "slug",
              r.title as "title",
              r.cover_image_id as "coverImageId",
              r.vote_count as "voteCount"
            from award_categories ac
            left join lateral (
              select
                row_number() over (
                  order by s.vote_count desc, s.game_id asc
                )::int as place,
                s.game_id,
                g.slug,
                g.title,
                cov.image_id as cover_image_id,
                s.vote_count
              from live_category_scores s
              inner join games g on g.id = s.game_id
              left join covers cov on cov.igdb_id = g.cover_igdb_id
              where s.year = ${year}
                and s.category_id = ac.id
              order by s.vote_count desc, s.game_id asc
              limit 10
            ) r on true
            where ac.active = true
          ) cat
        ),
        '[]'::json
      ) as categories
    from bounds b
  `;
}

function planText(rows) {
  return rows
    .map((row) => Object.values(row)[0])
    .filter((v) => typeof v === "string")
    .join("\n");
}

function execMs(text) {
  const m = text.match(/Execution Time:\s+([\d.]+)\s+ms/i);
  return m ? m[1] : "n/a";
}

const counts = await sql`
  select year, count(*)::int as n
  from live_goty_scores
  group by year
  order by n desc
  limit 5
`;

if (!counts.length) {
  console.error("No live_goty_scores rows. Seed a year first (/admin/seed).");
  process.exit(1);
}

const year = counts[0].year;
const gotyTotal = counts[0].n;
const totalPages = Math.max(1, Math.ceil(gotyTotal / pageSize));
const pages = {
  page1: 1,
  middle: Math.max(1, Math.ceil(totalPages / 2)),
  last: totalPages,
};

const chunks = [
  `label=${label}`,
  `year=${year}`,
  `goty_total=${gotyTotal}`,
  `total_pages=${totalPages}`,
  `page_size=${pageSize}`,
  "",
];

const summary = [];

for (const [name, page] of Object.entries(pages)) {
  const rows = await sql.query(bundleSql(year, page));
  const text = planText(rows);
  const ms = execMs(text);
  summary.push(`${name} (page ${page}): ${ms} ms`);
  chunks.push(`===== ${name} page=${page} =====`);
  chunks.push(text);
  chunks.push("");
}

const outPath = resolve(
  `docs/explain-live-standings-${label}-year-${year}.txt`,
);
writeFileSync(outPath, chunks.join("\n"), "utf8");
console.log(`year ${year}  scored_games ${gotyTotal}  pages ${totalPages}`);
for (const line of summary) console.log(line);
console.log(`wrote ${outPath}`);
