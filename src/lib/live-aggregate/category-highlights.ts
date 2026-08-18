import { sql } from "drizzle-orm";
import { type Db } from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";
import { getPublicBoardMinCategoryVotes } from "@/lib/site-settings/service";

export type CategoryHighlightGame = {
  gameId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
};

export type CategoryHighlightWinner = {
  categoryId: string;
  label: string;
  games: CategoryHighlightGame[];
};

export type YearCategoryHighlights = {
  year: number;
  winners: CategoryHighlightWinner[];
};

function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function coverUrlFrom(imageId: string | null | undefined): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

/** Highest vote total among categories in a year (for the public-category floor). */
export async function getYearMaxCategoryVotes(
  year: number,
  db: Db = getLiveAggregateDb(),
): Promise<number> {
  const result = await db.execute(sql`
    select coalesce(max(votes), 0)::int as total
    from (
      select sum(vote_count)::int as votes
      from live_category_scores
      where year = ${year}
      group by category_id
    ) t
  `);
  return asInt(result.rows[0]?.total);
}

/**
 * Up to five most-voted site awards per year, each with every #1 game
 * (ties included for rotate). A category is omitted until its own vote
 * total meets the floor.
 */
export async function getCategoryHighlightsForYears(
  years: readonly number[],
  opts: { minVotes?: number; limit?: number } = {},
  db: Db = getLiveAggregateDb(),
): Promise<YearCategoryHighlights[]> {
  const unique = [...new Set(years.map((y) => Math.floor(y)))].filter((y) =>
    Number.isFinite(y),
  );
  if (unique.length === 0) return [];

  const min = opts.minVotes ?? (await getPublicBoardMinCategoryVotes(db));
  const limit = Math.max(1, Math.floor(opts.limit ?? 5));

  const result = await db.execute(sql`
    with totals as (
      select
        year,
        category_id,
        sum(vote_count)::int as votes
      from live_category_scores
      where year in (${sql.join(unique.map((y) => sql`${y}`), sql`, `)})
      group by year, category_id
      having sum(vote_count) >= ${min}
    ),
    ranked as (
      select
        t.*,
        row_number() over (
          partition by t.year
          order by t.votes desc, t.category_id
        ) as rn
      from totals t
    ),
    top_cats as (
      select * from ranked where rn <= ${limit}
    ),
    winners as (
      select
        s.year,
        s.category_id,
        s.game_id,
        s.vote_count
      from live_category_scores s
      inner join top_cats t
        on t.year = s.year and t.category_id = s.category_id
      where not exists (
        select 1
        from live_category_scores other
        where other.year = s.year
          and other.category_id = s.category_id
          and other.vote_count > s.vote_count
      )
    )
    select
      w.year,
      w.category_id as "categoryId",
      ac.label,
      w.game_id as "gameId",
      g.slug,
      g.title,
      c.image_id as "coverImageId",
      t.rn,
      w.vote_count as "voteCount"
    from winners w
    inner join top_cats t
      on t.year = w.year and t.category_id = w.category_id
    inner join award_categories ac on ac.id = w.category_id
    inner join games g on g.id = w.game_id
    left join covers c on c.igdb_id = g.cover_igdb_id
    order by w.year desc, t.rn, w.vote_count desc, w.game_id
  `);

  const byYear = new Map<number, CategoryHighlightWinner[]>();
  const indexByKey = new Map<string, number>();

  for (const raw of result.rows as Array<{
    year: unknown;
    categoryId: unknown;
    label: unknown;
    gameId: unknown;
    slug: unknown;
    title: unknown;
    coverImageId: unknown;
  }>) {
    const year = asInt(raw.year);
    const categoryId = String(raw.categoryId);
    const key = `${year}:${categoryId}`;
    const list = byYear.get(year) ?? [];
    let idx = indexByKey.get(key);
    if (idx == null) {
      idx = list.length;
      indexByKey.set(key, idx);
      list.push({
        categoryId,
        label: String(raw.label),
        games: [],
      });
      byYear.set(year, list);
    }
    list[idx]?.games.push({
      gameId: String(raw.gameId),
      slug: String(raw.slug),
      title: String(raw.title),
      coverUrl: coverUrlFrom(
        typeof raw.coverImageId === "string" ? raw.coverImageId : null,
      ),
    });
  }

  return unique
    .filter((year) => byYear.has(year))
    .map((year) => ({
      year,
      winners: byYear.get(year) ?? [],
    }))
    .filter((block) => block.winners.length > 0);
}
