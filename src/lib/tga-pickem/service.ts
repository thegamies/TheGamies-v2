import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import {
  covers,
  createDb,
  games,
  tgaCategories,
  tgaCategoryNominees,
  tgaCommunityYears,
  tgaNominees,
  tgaYears,
  type Db,
} from "@thegamies/db";
import { YEAR_PICKER_MAX, YEAR_PICKER_MIN } from "@/lib/ui/calendar-year";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";
import { seedCategoryRows, TGA_2025_CATEGORIES } from "./category-seed";
import {
  nomineeSearchTitles,
  normalizeNomineeTitle,
  TGA_2025_NOMINEES,
} from "./nominee-seed";
import { callTgaWinner } from "./scores";
import { nomineeMatchesWinner, TGA_2025_WINNERS } from "./winner-seed";
import {
  computeTgaStatus,
  slateCompleteReason,
  type TgaNomineeCheck,
  type TgaStatus,
  validateTgaSchedule,
} from "./status";

function getDb(db?: Db): Db {
  return db ?? createDb();
}

export function parseTgaYear(raw: unknown): number | { error: string } {
  const year = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(year) || year < YEAR_PICKER_MIN || year > YEAR_PICKER_MAX) {
    return { error: "Choose a valid year." };
  }
  return year;
}

export type TgaYearRow = typeof tgaYears.$inferSelect;

export type TgaYearPublic = TgaYearRow & {
  status: TgaStatus;
  complete: boolean;
  completeReason: string | null;
};

function coverUrlFrom(imageId: string | null | undefined): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

export function nomineeImageUrl(input: {
  imageUrl: string | null;
  coverImageId?: string | null;
}): string | null {
  return input.imageUrl || coverUrlFrom(input.coverImageId) || null;
}

async function categoryChecks(
  db: Db,
  year: number,
): Promise<TgaNomineeCheck[]> {
  const rows = await db.execute(sql`
    select
      c.kind,
      count(cn.nominee_id)::int as nominee_count,
      count(*) filter (
        where c.kind = 'game' and n.game_id is null
      )::int as game_missing,
      count(*) filter (
        where c.kind = 'other' and (n.image_url is null or n.image_url = '')
      )::int as other_missing
    from tga_categories c
    left join tga_category_nominees cn on cn.category_id = c.id
    left join tga_nominees n on n.id = cn.nominee_id
    where c.year = ${year}
    group by c.id, c.kind
  `);
  return rows.rows.map((row) => ({
    kind: row.kind === "other" ? "other" : "game",
    nomineeCount: Number(row.nominee_count ?? 0),
    gameNomineesMissingGame: Number(row.game_missing ?? 0),
    otherNomineesMissingArt: Number(row.other_missing ?? 0),
  }));
}

export async function withYearPublic(
  year: TgaYearRow,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<TgaYearPublic> {
  const checks = await categoryChecks(db, year.year);
  const completeReason = slateCompleteReason(checks, year);
  return {
    ...year,
    status: computeTgaStatus(year, now),
    complete: completeReason == null,
    completeReason,
  };
}

export async function listTgaYears(db: Db = getDb()): Promise<TgaYearPublic[]> {
  const rows = await db.select().from(tgaYears).orderBy(desc(tgaYears.year));
  return Promise.all(rows.map((row) => withYearPublic(row, db)));
}

export async function getTgaYear(
  year: number,
  db: Db = getDb(),
): Promise<TgaYearPublic | null> {
  const [row] = await db.select().from(tgaYears).where(eq(tgaYears.year, year));
  if (!row) return null;
  return withYearPublic(row, db);
}

export async function getPromotedTgaYear(
  db: Db = getDb(),
): Promise<TgaYearPublic | null> {
  const [row] = await db
    .select()
    .from(tgaYears)
    .where(and(eq(tgaYears.enabled, true), eq(tgaYears.promoted, true)));
  if (!row) return null;
  return withYearPublic(row, db);
}

/** Same year community `/the-game-awards` redirects to. */
export async function resolveTgaLandingYear(
  db: Db = getDb(),
): Promise<number | null> {
  const promoted = await getPromotedTgaYear(db);
  if (promoted) return promoted.year;
  const years = await listTgaYears(db);
  return years.find((row) => row.enabled)?.year ?? null;
}

/** Cheap chrome lookup — no category completeness check. */
export async function getPromotedTgaHref(
  db: Db = getDb(),
): Promise<string | null> {
  const [row] = await db
    .select({ year: tgaYears.year })
    .from(tgaYears)
    .where(and(eq(tgaYears.enabled, true), eq(tgaYears.promoted, true)));
  return row ? `/the-game-awards/${row.year}` : null;
}

export async function getEnabledTgaYear(
  year: number,
  db: Db = getDb(),
): Promise<TgaYearPublic | null> {
  const found = await getTgaYear(year, db);
  if (!found?.enabled) return null;
  return found;
}

export async function createTgaYear(
  year: number,
  db: Db = getDb(),
): Promise<TgaYearPublic | { error: string }> {
  const parsed = parseTgaYear(year);
  if (typeof parsed !== "number") return parsed;
  const existing = await getTgaYear(parsed, db);
  if (existing) return { error: "That year already exists." };
  await db.insert(tgaYears).values({ year: parsed, updatedAt: new Date() });
  const created = await getTgaYear(parsed, db);
  return created ?? { error: "Could not create the year." };
}

export async function saveTgaSchedule(
  year: number,
  input: { opensAt: Date; showStartsAt: Date },
  db: Db = getDb(),
): Promise<TgaYearPublic | { error: string }> {
  const invalid = validateTgaSchedule(input.opensAt, input.showStartsAt);
  if (invalid) return { error: invalid };
  const [row] = await db
    .update(tgaYears)
    .set({
      opensAt: input.opensAt,
      showStartsAt: input.showStartsAt,
      updatedAt: new Date(),
    })
    .where(eq(tgaYears.year, year))
    .returning();
  if (!row) return { error: "Year not found." };
  return withYearPublic(row, db);
}

export async function setTgaEnabled(
  year: number,
  enabled: boolean,
  db: Db = getDb(),
): Promise<TgaYearPublic | { error: string }> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  if (enabled && current.completeReason) {
    return { error: current.completeReason };
  }
  const [row] = await db
    .update(tgaYears)
    .set({
      enabled,
      promoted: enabled ? current.promoted : false,
      updatedAt: new Date(),
    })
    .where(eq(tgaYears.year, year))
    .returning();
  if (!row) return { error: "Year not found." };
  return withYearPublic(row, db);
}

export async function goLiveTgaYear(
  year: number,
  now: Date = new Date(),
  db: Db = getDb(),
): Promise<TgaYearPublic | { error: string }> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  const showStartsAt = current.showStartsAt;
  if (!showStartsAt) {
    return { error: "Set when the show starts first." };
  }
  if (!(now.getTime() < showStartsAt.getTime())) {
    return { error: "Show start must be after now to go live." };
  }
  const scheduleError = validateTgaSchedule(now, showStartsAt);
  if (scheduleError) return { error: scheduleError };
  const completeReason = slateCompleteReason(
    await categoryChecks(db, year),
    { opensAt: now, showStartsAt },
  );
  if (completeReason) return { error: completeReason };
  const [row] = await db
    .update(tgaYears)
    .set({
      enabled: true,
      opensAt: now,
      updatedAt: now,
    })
    .where(eq(tgaYears.year, year))
    .returning();
  if (!row) return { error: "Year not found." };
  return withYearPublic(row, db, now);
}

export async function setTgaPromoted(
  year: number,
  promoted: boolean,
  db: Db = getDb(),
): Promise<TgaYearPublic | { error: string }> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  if (promoted) {
    if (!current.enabled) return { error: "Turn the year on before promoting." };
    if (current.completeReason) return { error: current.completeReason };
    await db
      .update(tgaYears)
      .set({ promoted: false, updatedAt: new Date() })
      .where(eq(tgaYears.promoted, true));
  }
  const [row] = await db
    .update(tgaYears)
    .set({ promoted, updatedAt: new Date() })
    .where(eq(tgaYears.year, year))
    .returning();
  if (!row) return { error: "Year not found." };
  return withYearPublic(row, db);
}

export async function load2025Categories(
  year: number,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  const existing = await db
    .select({ id: tgaCategories.id })
    .from(tgaCategories)
    .where(eq(tgaCategories.year, year))
    .limit(1);
  if (existing.length > 0) {
    return { error: "This year already has categories." };
  }
  await db.insert(tgaCategories).values(
    seedCategoryRows(TGA_2025_CATEGORIES).map((row) => ({
      year,
      label: row.label,
      description: row.description,
      kind: row.kind,
      sortOrder: row.sortOrder,
    })),
  );
  return load2025Nominees(year, db);
}

async function clearYearNominees(year: number, db: Db) {
  await db.execute(sql`
    delete from tga_winners w
    using tga_categories c
    where w.category_id = c.id and c.year = ${year}
  `);
  await db.execute(sql`
    delete from tga_site_picks where year = ${year}
  `);
  await db.execute(sql`
    delete from tga_community_picks where year = ${year}
  `);
  await db.execute(sql`
    update tga_site_scores
    set points = 0, updated_at = now()
    where year = ${year}
  `);
  await db.execute(sql`
    update tga_community_scores
    set points = 0, updated_at = now()
    where year = ${year}
  `);
  await db.execute(sql`
    delete from tga_category_nominees cn
    using tga_categories c
    where cn.category_id = c.id and c.year = ${year}
  `);
  await db.execute(sql`
    delete from tga_nominees where year = ${year}
  `);
}

async function findCatalogGameId(
  titles: string[],
  db: Db,
): Promise<string | null> {
  const wanted = [...new Set(titles.map(normalizeNomineeTitle))];
  const matchers = titles.flatMap((title) => [
    ilike(games.title, title),
    ilike(games.slug, title.replace(/\s+/g, "-")),
  ]);
  if (matchers.length === 0) return null;
  const rows = await db
    .select({ id: games.id, title: games.title, popularity: games.popularity })
    .from(games)
    .where(and(isNull(games.igdbRemovedAt), or(...matchers)))
    .orderBy(desc(games.popularity))
    .limit(12);
  const exact = rows.find((row) =>
    wanted.includes(normalizeNomineeTitle(row.title)),
  );
  return exact?.id ?? rows[0]?.id ?? null;
}

export async function load2025Nominees(
  year: number,
  db: Db = getDb(),
): Promise<
  | { ok: true; attached: number; unmatched: string[] }
  | { error: string }
> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  const categories = await db
    .select()
    .from(tgaCategories)
    .where(eq(tgaCategories.year, year));
  if (categories.length === 0) {
    return { error: "Load 2025 categories first." };
  }

  await clearYearNominees(year, db);
  await db
    .delete(tgaCategories)
    .where(
      and(eq(tgaCategories.year, year), eq(tgaCategories.label, "Game Changer")),
    );

  const unmatched: string[] = [];
  let attached = 0;

  for (const category of categories) {
    if (category.label === "Game Changer") continue;
    const seed = TGA_2025_NOMINEES[category.label];
    if (!seed) continue;
    const existing = await db
      .select({
        nomineeId: tgaCategoryNominees.nomineeId,
        displayName: tgaNominees.displayName,
        gameId: tgaNominees.gameId,
      })
      .from(tgaCategoryNominees)
      .innerJoin(tgaNominees, eq(tgaNominees.id, tgaCategoryNominees.nomineeId))
      .where(eq(tgaCategoryNominees.categoryId, category.id));
    const haveNames = new Set(
      existing.map((row) => normalizeNomineeTitle(row.displayName)),
    );
    const haveGames = new Set(
      existing.map((row) => row.gameId).filter((id): id is string => Boolean(id)),
    );

    for (const nominee of seed) {
      if (nominee.type === "other") {
        if (haveNames.has(normalizeNomineeTitle(nominee.name))) continue;
        if (category.kind !== "other") {
          unmatched.push(`${category.label}: ${nominee.name}`);
          continue;
        }
        const added = await addOtherNominee(year, category.id, nominee.name, db);
        if ("error" in added) unmatched.push(`${category.label}: ${nominee.name}`);
        else attached += 1;
        continue;
      }

      const titles = nomineeSearchTitles(nominee);
      const gameId = await findCatalogGameId(titles, db);
      if (!gameId) {
        unmatched.push(`${category.label}: ${titles[0]}`);
        continue;
      }
      if (haveGames.has(gameId)) continue;
      if (category.kind !== "game") {
        unmatched.push(`${category.label}: ${titles[0]}`);
        continue;
      }
      const added = await addGameNominee(year, category.id, gameId, db);
      if ("error" in added) unmatched.push(`${category.label}: ${titles[0]}`);
      else {
        attached += 1;
        haveGames.add(gameId);
      }
    }
  }

  return { ok: true, attached, unmatched };
}

export async function load2025Winners(
  year: number,
  db: Db = getDb(),
): Promise<
  | { ok: true; called: number; unmatched: string[] }
  | { error: string }
> {
  const current = await getTgaYear(year, db);
  if (!current) return { error: "Year not found." };
  const ballot = await listTgaBallot(year, db);
  if (ballot.length === 0) {
    return { error: "Load 2025 nominees first." };
  }

  const unmatched: string[] = [];
  let called = 0;

  for (const category of ballot) {
    const aliases = TGA_2025_WINNERS[category.label];
    if (!aliases?.length) {
      unmatched.push(category.label);
      continue;
    }
    const winner = category.nominees.find((nominee) =>
      nomineeMatchesWinner(nominee.displayName, aliases),
    );
    if (!winner) {
      unmatched.push(`${category.label}: ${aliases[0]}`);
      continue;
    }
    const result = await callTgaWinner(year, category.id, winner.id, db);
    if ("error" in result) unmatched.push(`${category.label}: ${aliases[0]}`);
    else called += 1;
  }

  return { ok: true, called, unmatched };
}

export async function copyTgaCategories(
  fromYear: number,
  toYear: number,
  replace: boolean,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  if (fromYear === toYear) return { error: "Choose a different year." };
  const source = await getTgaYear(fromYear, db);
  if (!source) return { error: "Source year not found." };
  let target = await getTgaYear(toYear, db);
  if (!target) {
    const created = await createTgaYear(toYear, db);
    if ("error" in created) return created;
    target = created;
  }
  const existing = await db
    .select({ id: tgaCategories.id })
    .from(tgaCategories)
    .where(eq(tgaCategories.year, toYear));
  if (existing.length > 0 && !replace) {
    return { error: "That year already has categories." };
  }
  if (existing.length > 0) {
    await db.delete(tgaCategories).where(eq(tgaCategories.year, toYear));
  }
  const rows = await db
    .select()
    .from(tgaCategories)
    .where(eq(tgaCategories.year, fromYear))
    .orderBy(asc(tgaCategories.sortOrder));
  if (rows.length === 0) return { error: "Source year has no categories." };
  await db.insert(tgaCategories).values(
    rows.map((row) => ({
      year: toYear,
      label: row.label,
      description: row.description,
      kind: row.kind,
      sortOrder: row.sortOrder,
    })),
  );
  return { ok: true };
}

export async function createTgaCategory(
  year: number,
  input: { label: string; kind: "game" | "other"; description?: string },
  db: Db = getDb(),
): Promise<{ id: string } | { error: string }> {
  const label = input.label.trim();
  if (!label) return { error: "Name the category." };
  if (input.kind !== "game" && input.kind !== "other") {
    return { error: "Choose game or other." };
  }
  const [max] = await db
    .select({ sort: tgaCategories.sortOrder })
    .from(tgaCategories)
    .where(eq(tgaCategories.year, year))
    .orderBy(desc(tgaCategories.sortOrder))
    .limit(1);
  const [row] = await db
    .insert(tgaCategories)
    .values({
      year,
      label,
      kind: input.kind,
      description: input.description?.trim() || null,
      sortOrder: (max?.sort ?? 0) + 1,
    })
    .returning({ id: tgaCategories.id });
  return row ?? { error: "Could not add the category." };
}

export async function updateTgaCategory(
  categoryId: string,
  input: { label?: string; kind?: "game" | "other"; description?: string | null },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const [current] = await db
    .select()
    .from(tgaCategories)
    .where(eq(tgaCategories.id, categoryId));
  if (!current) return { error: "Category not found." };
  if (input.kind && input.kind !== current.kind) {
    const [attached] = await db
      .select({ nomineeId: tgaCategoryNominees.nomineeId })
      .from(tgaCategoryNominees)
      .where(eq(tgaCategoryNominees.categoryId, categoryId))
      .limit(1);
    if (attached) {
      return { error: "Remove nominees before changing the category type." };
    }
  }
  await db
    .update(tgaCategories)
    .set({
      label: input.label?.trim() || current.label,
      kind: input.kind ?? current.kind,
      description:
        input.description === undefined
          ? current.description
          : input.description?.trim() || null,
    })
    .where(eq(tgaCategories.id, categoryId));
  return { ok: true };
}

export async function deleteTgaCategory(
  categoryId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const winner = await db.execute(sql`
    select 1 from tga_winners where category_id = ${categoryId} limit 1
  `);
  if (winner.rows.length > 0) {
    return { error: "Clear the winner before deleting this category." };
  }
  await db.delete(tgaCategories).where(eq(tgaCategories.id, categoryId));
  return { ok: true };
}

export async function reorderTgaCategories(
  year: number,
  categoryIds: string[],
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  for (const [index, id] of categoryIds.entries()) {
    await db
      .update(tgaCategories)
      .set({ sortOrder: index + 1 })
      .where(and(eq(tgaCategories.id, id), eq(tgaCategories.year, year)));
  }
  return { ok: true };
}

export async function addGameNominee(
  year: number,
  categoryId: string,
  gameId: string,
  db: Db = getDb(),
): Promise<{ id: string } | { error: string }> {
  const [category] = await db
    .select()
    .from(tgaCategories)
    .where(and(eq(tgaCategories.id, categoryId), eq(tgaCategories.year, year)));
  if (!category) return { error: "Category not found." };
  if (category.kind !== "game") {
    return { error: "This category is not a game award." };
  }
  const [game] = await db
    .select({
      id: games.id,
      title: games.title,
    })
    .from(games)
    .where(eq(games.id, gameId));
  if (!game) return { error: "Game not found." };

  const [existing] = await db
    .select()
    .from(tgaNominees)
    .where(and(eq(tgaNominees.year, year), eq(tgaNominees.gameId, gameId)));
  const nomineeId =
    existing?.id ??
    (
      await db
        .insert(tgaNominees)
        .values({
          year,
          displayName: game.title,
          gameId,
        })
        .returning({ id: tgaNominees.id })
    )[0]?.id;
  if (!nomineeId) return { error: "Could not add the nominee." };

  const [max] = await db
    .select({ sort: tgaCategoryNominees.sortOrder })
    .from(tgaCategoryNominees)
    .where(eq(tgaCategoryNominees.categoryId, categoryId))
    .orderBy(desc(tgaCategoryNominees.sortOrder))
    .limit(1);
  await db
    .insert(tgaCategoryNominees)
    .values({
      categoryId,
      nomineeId,
      sortOrder: (max?.sort ?? 0) + 1,
    })
    .onConflictDoNothing();
  return { id: nomineeId };
}

export async function addOtherNominee(
  year: number,
  categoryId: string,
  displayName: string,
  db: Db = getDb(),
): Promise<{ id: string } | { error: string }> {
  const [category] = await db
    .select()
    .from(tgaCategories)
    .where(and(eq(tgaCategories.id, categoryId), eq(tgaCategories.year, year)));
  if (!category) return { error: "Category not found." };
  if (category.kind !== "other") {
    return { error: "This category needs a catalog game." };
  }
  const name = displayName.trim();
  if (!name) return { error: "Name the nominee." };
  const [nominee] = await db
    .insert(tgaNominees)
    .values({ year, displayName: name })
    .returning({ id: tgaNominees.id });
  if (!nominee) return { error: "Could not add the nominee." };
  const [max] = await db
    .select({ sort: tgaCategoryNominees.sortOrder })
    .from(tgaCategoryNominees)
    .where(eq(tgaCategoryNominees.categoryId, categoryId))
    .orderBy(desc(tgaCategoryNominees.sortOrder))
    .limit(1);
  await db.insert(tgaCategoryNominees).values({
    categoryId,
    nomineeId: nominee.id,
    sortOrder: (max?.sort ?? 0) + 1,
  });
  return { id: nominee.id };
}

export async function setNomineeImageUrl(
  nomineeId: string,
  imageUrl: string | null,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const [row] = await db
    .update(tgaNominees)
    .set({ imageUrl })
    .where(eq(tgaNominees.id, nomineeId))
    .returning({ id: tgaNominees.id });
  if (!row) return { error: "Nominee not found." };
  return { ok: true };
}

export async function detachNominee(
  categoryId: string,
  nomineeId: string,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const winner = await db.execute(sql`
    select 1 from tga_winners
    where category_id = ${categoryId} and nominee_id = ${nomineeId}
    limit 1
  `);
  if (winner.rows.length > 0) {
    return { error: "Clear the winner before removing this nominee." };
  }
  await db
    .delete(tgaCategoryNominees)
    .where(
      and(
        eq(tgaCategoryNominees.categoryId, categoryId),
        eq(tgaCategoryNominees.nomineeId, nomineeId),
      ),
    );
  return { ok: true };
}

export type TgaBallotNominee = {
  id: string;
  displayName: string;
  gameId: string | null;
  slug: string | null;
  imageUrl: string | null;
};

export type TgaBallotCategory = {
  id: string;
  label: string;
  description: string | null;
  kind: "game" | "other";
  sortOrder: number;
  winnerNomineeId: string | null;
  nominees: TgaBallotNominee[];
};

export function maskTgaBallotWinners(
  categories: TgaBallotCategory[],
): TgaBallotCategory[] {
  return categories.map((category) => ({
    ...category,
    winnerNomineeId: null,
  }));
}

export async function listTgaBallot(
  year: number,
  db: Db = getDb(),
): Promise<TgaBallotCategory[]> {
  const categories = await db
    .select()
    .from(tgaCategories)
    .where(eq(tgaCategories.year, year))
    .orderBy(asc(tgaCategories.sortOrder), asc(tgaCategories.label));
  if (categories.length === 0) return [];

  const nominees = await db
    .select({
      categoryId: tgaCategoryNominees.categoryId,
      sortOrder: tgaCategoryNominees.sortOrder,
      id: tgaNominees.id,
      displayName: tgaNominees.displayName,
      gameId: tgaNominees.gameId,
      imageUrl: tgaNominees.imageUrl,
      slug: games.slug,
      coverImageId: covers.imageId,
    })
    .from(tgaCategoryNominees)
    .innerJoin(tgaNominees, eq(tgaNominees.id, tgaCategoryNominees.nomineeId))
    .leftJoin(games, eq(games.id, tgaNominees.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .innerJoin(tgaCategories, eq(tgaCategories.id, tgaCategoryNominees.categoryId))
    .where(eq(tgaCategories.year, year))
    .orderBy(asc(tgaCategoryNominees.sortOrder));

  const winners = await db.execute(sql`
    select w.category_id, w.nominee_id
    from tga_winners w
    inner join tga_categories c on c.id = w.category_id
    where c.year = ${year}
  `);
  const winnerByCategory = new Map(
    winners.rows.map((row) => [
      String(row.category_id),
      String(row.nominee_id),
    ]),
  );

  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    kind: category.kind,
    sortOrder: category.sortOrder,
    winnerNomineeId: winnerByCategory.get(category.id) ?? null,
    nominees: nominees
      .filter((row) => row.categoryId === category.id)
      .map((row) => ({
        id: row.id,
        displayName: row.displayName,
        gameId: row.gameId,
        slug: row.slug,
        imageUrl: nomineeImageUrl({
          imageUrl: row.imageUrl,
          coverImageId: row.coverImageId,
        }),
      })),
  }));
}

export async function isCommunityTgaOptedIn(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .select({ year: tgaCommunityYears.year })
    .from(tgaCommunityYears)
    .where(
      and(
        eq(tgaCommunityYears.communityId, communityId),
        eq(tgaCommunityYears.year, year),
      ),
    );
  return Boolean(row);
}

export async function setCommunityTgaOptIn(
  communityId: string,
  year: number,
  enabled: boolean,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const slate = await getTgaYear(year, db);
  if (!slate?.enabled) {
    return { error: `${TGA_PUBLIC_LABEL} is not on for that year.` };
  }
  if (enabled) {
    await db
      .insert(tgaCommunityYears)
      .values({ communityId, year })
      .onConflictDoNothing();
    const { seedTgaHostsOnOptIn } = await import(
      "@/lib/communities/community-hosts"
    );
    await seedTgaHostsOnOptIn(communityId, year, null, db);
  } else {
    await db
      .delete(tgaCommunityYears)
      .where(
        and(
          eq(tgaCommunityYears.communityId, communityId),
          eq(tgaCommunityYears.year, year),
        ),
      );
  }
  return { ok: true };
}

export async function communityTgaNavVisible(
  communityId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .select({ year: tgaCommunityYears.year })
    .from(tgaCommunityYears)
    .innerJoin(tgaYears, eq(tgaYears.year, tgaCommunityYears.year))
    .where(
      and(
        eq(tgaCommunityYears.communityId, communityId),
        eq(tgaYears.enabled, true),
      ),
    )
    .limit(1);
  return Boolean(row);
}
