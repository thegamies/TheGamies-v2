import { and, desc, ilike, isNull, or } from "drizzle-orm";
import { games, type Db } from "@thegamies/db";
import { normalizeNomineeTitle } from "@/lib/tga-pickem/nominee-seed";
import {
  DEMO_2025_CATEGORIES,
  DEMO_2025_GOTY,
  resolveTitleDef,
  uniqueTitlesForLookup,
  type DemoPickable,
} from "./seed-2025-demo";

const LOOKUP_CHUNK = 20;

async function loadCatalogMatches(
  titles: string[],
  db: Db,
): Promise<Array<{ id: string; title: string }>> {
  const unique = [...new Set(titles.map((t) => t.trim()).filter(Boolean))];
  const found: Array<{ id: string; title: string }> = [];
  for (let i = 0; i < unique.length; i += LOOKUP_CHUNK) {
    const chunk = unique.slice(i, i + LOOKUP_CHUNK);
    const matchers = chunk.flatMap((title) => [
      ilike(games.title, title),
      ilike(games.slug, title.replace(/\s+/g, "-")),
    ]);
    if (matchers.length === 0) continue;
    const rows = await db
      .select({
        id: games.id,
        title: games.title,
        popularity: games.popularity,
      })
      .from(games)
      .where(and(isNull(games.igdbRemovedAt), or(...matchers)))
      .orderBy(desc(games.popularity))
      .limit(80);
    found.push(...rows);
  }
  return found;
}

function pickGameId(
  titles: string[],
  rows: Array<{ id: string; title: string }>,
): string | null {
  const wanted = new Set(titles.map(normalizeNomineeTitle));
  const exact = rows.find((row) =>
    wanted.has(normalizeNomineeTitle(row.title)),
  );
  return exact?.id ?? null;
}

export type Demo2025Resolved = {
  goty: DemoPickable[];
  categories: Array<{ categoryId: string; games: DemoPickable[] }>;
  unmatched: string[];
};

export async function resolveDemo2025Catalog(
  db: Db,
): Promise<Demo2025Resolved> {
  const lookup = uniqueTitlesForLookup();
  const allTitles = lookup.flatMap((row) => row.titles);
  const rows = await loadCatalogMatches(allTitles, db);

  const idByKey = new Map<string, string>();
  const unmatched: string[] = [];

  for (const row of lookup) {
    const gameId = pickGameId(row.titles, rows);
    if (!gameId) {
      unmatched.push(row.titles[0] ?? row.key);
      continue;
    }
    idByKey.set(row.key, gameId);
  }

  const goty: DemoPickable[] = [];
  for (const row of DEMO_2025_GOTY) {
    const gameId = idByKey.get(row.key);
    if (!gameId) continue;
    goty.push({
      key: row.key,
      gameId,
      weight: row.weight,
      tags: row.tags,
    });
  }

  const categories = DEMO_2025_CATEGORIES.map((cat) => {
    const gamesForCat: DemoPickable[] = [];
    for (const pick of cat.picks) {
      const def = resolveTitleDef(pick);
      const gameId = idByKey.get(pick.key);
      if (!def || !gameId) continue;
      gamesForCat.push({
        key: pick.key,
        gameId,
        weight: pick.weight,
        tags: def.tags,
      });
    }
    return { categoryId: cat.categoryId, games: gamesForCat };
  });

  return { goty, categories, unmatched };
}
