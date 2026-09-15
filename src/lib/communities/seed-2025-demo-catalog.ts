import { and, desc, ilike, isNull, or } from "drizzle-orm";
import { games, type Db } from "@thegamies/db";
import { normalizeNomineeTitle } from "@/lib/tga-pickem/nominee-seed";
import {
  DEMO_2025_CATEGORIES,
  DEMO_2025_GOTY,
  DEMO_2025_YEAR,
  resolveTitleDef,
  uniqueTitlesForLookup,
  type DemoCategoryPickDef,
  type DemoPickable,
  type DemoTitleDef,
} from "./seed-2025-demo";
import {
  DEMO_2026_CATEGORIES,
  DEMO_2026_YEAR,
  resolveDemo2026TitleDef,
  uniqueTitlesFor2026Lookup,
} from "./seed-2026-demo";

const LOOKUP_CHUNK = 20;

export type Demo2025CatalogRow = {
  id: string;
  title: string;
  year: number | null;
};

async function loadCatalogMatches(
  titles: string[],
  db: Db,
): Promise<Demo2025CatalogRow[]> {
  const unique = [...new Set(titles.map((t) => t.trim()).filter(Boolean))];
  const found: Demo2025CatalogRow[] = [];
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
        year: games.year,
        popularity: games.popularity,
      })
      .from(games)
      .where(and(isNull(games.igdbRemovedAt), or(...matchers)))
      .orderBy(desc(games.popularity))
      .limit(80);
    found.push(
      ...rows.map((row) => ({
        id: row.id,
        title: row.title,
        year: row.year,
      })),
    );
  }
  return found;
}

/**
 * Prefer a catalog-year match. Category-only titles must be that year;
 * curated GOTY keys may fall back if IGDB stored an earlier early-access year.
 */
export function pickDemo2025CatalogId(
  titles: string[],
  rows: Demo2025CatalogRow[],
  opts: { year?: number; requireYear?: boolean } = {},
): string | null {
  const year = opts.year ?? DEMO_2025_YEAR;
  const wanted = new Set(titles.map(normalizeNomineeTitle));
  const matches = rows.filter((row) =>
    wanted.has(normalizeNomineeTitle(row.title)),
  );
  const inYear = matches.find((row) => row.year === year);
  if (inYear) return inYear.id;
  if (opts.requireYear) return null;
  return matches[0]?.id ?? null;
}

export type Demo2025Resolved = {
  goty: DemoPickable[];
  categories: Array<{ categoryId: string; games: DemoPickable[] }>;
  unmatched: string[];
};

async function resolveDemoYearCatalog(opts: {
  db: Db;
  year: number;
  lookup: Array<{ key: string; titles: string[] }>;
  goty: readonly DemoTitleDef[];
  categories: ReadonlyArray<{
    categoryId: string;
    picks: readonly DemoCategoryPickDef[];
  }>;
  resolvePick: (pick: DemoCategoryPickDef) => DemoTitleDef | null;
  yearOptionalKeys?: ReadonlySet<string>;
}): Promise<Demo2025Resolved> {
  const allTitles = opts.lookup.flatMap((row) => row.titles);
  const rows = await loadCatalogMatches(allTitles, opts.db);
  const gotyKeys = new Set(opts.goty.map((row) => row.key));
  const yearOptional = opts.yearOptionalKeys ?? new Set<string>();

  const idByKey = new Map<string, string>();
  const unmatched: string[] = [];

  for (const row of opts.lookup) {
    const gameId = pickDemo2025CatalogId(row.titles, rows, {
      year: opts.year,
      requireYear: !gotyKeys.has(row.key) && !yearOptional.has(row.key),
    });
    if (!gameId) {
      unmatched.push(row.titles[0] ?? row.key);
      continue;
    }
    idByKey.set(row.key, gameId);
  }

  const goty: DemoPickable[] = [];
  for (const row of opts.goty) {
    const gameId = idByKey.get(row.key);
    if (!gameId) continue;
    goty.push({
      key: row.key,
      gameId,
      weight: row.weight,
      tags: row.tags,
    });
  }

  const categories = opts.categories.map((cat) => {
    const gamesForCat: DemoPickable[] = [];
    for (const pick of cat.picks) {
      const def = opts.resolvePick(pick);
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

export async function resolveDemo2025Catalog(
  db: Db,
): Promise<Demo2025Resolved> {
  return resolveDemoYearCatalog({
    db,
    year: DEMO_2025_YEAR,
    lookup: uniqueTitlesForLookup(),
    goty: DEMO_2025_GOTY,
    categories: DEMO_2025_CATEGORIES,
    resolvePick: resolveTitleDef,
  });
}

/** Early-access titles may still be stored as an earlier IGDB year. */
const DEMO_2026_YEAR_OPTIONAL_KEYS = new Set(["valheim", "slay-the-spire-2"]);

export async function resolveDemo2026Catalog(
  db: Db,
): Promise<Demo2025Resolved> {
  return resolveDemoYearCatalog({
    db,
    year: DEMO_2026_YEAR,
    lookup: uniqueTitlesFor2026Lookup(),
    goty: [],
    categories: DEMO_2026_CATEGORIES,
    resolvePick: resolveDemo2026TitleDef,
    yearOptionalKeys: DEMO_2026_YEAR_OPTIONAL_KEYS,
  });
}

export function demo2025CategoriesForActiveAwards(
  resolved: Demo2025Resolved,
  activeCategoryIds: ReadonlySet<string>,
): Demo2025Resolved["categories"] {
  return resolved.categories.filter(
    (cat) => activeCategoryIds.has(cat.categoryId) && cat.games.length > 0,
  );
}
