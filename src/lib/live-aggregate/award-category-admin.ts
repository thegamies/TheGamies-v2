import { asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { awardCategories, type Db } from "@thegamies/db";
import { getLiveAggregateDb } from "./contrib";
import {
  parseAwardCategoryEligibility,
  parseAwardCategoryGroup,
  siteGotyRevalidatePaths,
  slugifyAwardCategoryId,
  type AwardCategoryEligibility,
  type AwardCategoryGroup,
} from "./award-category-defs";

export const ADMIN_AWARD_PAGE_SIZE = 50;
export const ADMIN_AWARD_SEARCH_LIMIT = 50;
export const ADMIN_AWARD_LABEL_MAX = 80;
export const ADMIN_AWARD_DESCRIPTION_MAX = 280;

export type AwardCategoryRow = {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  categoryGroup: string;
  eligibility: string;
  allowEditions: boolean;
  allowDlcAddon: boolean;
  currentOrPreviousYear: boolean;
  active: boolean;
};

export type AwardCategoryWriteInput = {
  label: string;
  description: string;
  categoryGroup: AwardCategoryGroup;
  eligibility: AwardCategoryEligibility;
  sortOrder: number;
  allowEditions: boolean;
  allowDlcAddon: boolean;
  currentOrPreviousYear: boolean;
  active: boolean;
};

const writeSelect = {
  id: awardCategories.id,
  label: awardCategories.label,
  description: awardCategories.description,
  sortOrder: awardCategories.sortOrder,
  categoryGroup: awardCategories.categoryGroup,
  eligibility: awardCategories.eligibility,
  allowEditions: awardCategories.allowEditions,
  allowDlcAddon: awardCategories.allowDlcAddon,
  currentOrPreviousYear: awardCategories.currentOrPreviousYear,
  active: awardCategories.active,
} as const;

export function parseAwardCategoryWriteInput(raw: {
  label?: unknown;
  description?: unknown;
  categoryGroup?: unknown;
  eligibility?: unknown;
  sortOrder?: unknown;
  allowEditions?: unknown;
  allowDlcAddon?: unknown;
  currentOrPreviousYear?: unknown;
  active?: unknown;
}): AwardCategoryWriteInput | { error: string } {
  const label =
    typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) return { error: "Name is required." };
  if (label.length > ADMIN_AWARD_LABEL_MAX) {
    return { error: "Name is too long." };
  }
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > ADMIN_AWARD_DESCRIPTION_MAX) {
    return { error: "Description is too long." };
  }
  const sortRaw =
    typeof raw.sortOrder === "number"
      ? raw.sortOrder
      : Number(typeof raw.sortOrder === "string" ? raw.sortOrder : NaN);
  if (!Number.isInteger(sortRaw) || sortRaw < 1 || sortRaw > 9999) {
    return { error: "Order must be a whole number from 1 to 9999." };
  }
  return {
    label,
    description,
    categoryGroup: parseAwardCategoryGroup(raw.categoryGroup),
    eligibility: parseAwardCategoryEligibility(raw.eligibility),
    sortOrder: sortRaw,
    allowEditions: raw.allowEditions === true,
    allowDlcAddon: raw.allowDlcAddon === true,
    currentOrPreviousYear: raw.currentOrPreviousYear === true,
    active: raw.active === true,
  };
}

export function awardCategoryRevalidatePaths(): string[] {
  const year = new Date().getUTCFullYear();
  return [
    "/admin/awards",
    "/create/goty",
    "/game-of-the-year",
    ...siteGotyRevalidatePaths(year),
    ...siteGotyRevalidatePaths(year - 1),
  ];
}

export async function getAwardCategoryById(
  id: string,
  db: Db = getLiveAggregateDb(),
): Promise<AwardCategoryRow | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const [row] = await db
    .select(writeSelect)
    .from(awardCategories)
    .where(eq(awardCategories.id, trimmed))
    .limit(1);
  return row ?? null;
}

export async function listAwardCategoriesForAdmin(
  opts: { q?: string; page?: number } = {},
  db: Db = getLiveAggregateDb(),
): Promise<{ rows: AwardCategoryRow[]; total: number; page: number }> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const q = opts.q?.trim() ?? "";
  const limit = q ? ADMIN_AWARD_SEARCH_LIMIT : ADMIN_AWARD_PAGE_SIZE;
  const offset = (page - 1) * limit;
  const term = `%${q}%`;
  const where =
    q.length > 0
      ? or(
          ilike(awardCategories.label, term),
          ilike(awardCategories.id, term),
          ilike(awardCategories.description, term),
        )
      : sql`true`;

  const [totalRow] = await db
    .select({ n: count() })
    .from(awardCategories)
    .where(where);
  const rows = await db
    .select(writeSelect)
    .from(awardCategories)
    .where(where)
    .orderBy(asc(awardCategories.sortOrder), asc(awardCategories.label))
    .limit(limit)
    .offset(offset);
  return { rows, total: Number(totalRow?.n ?? 0), page };
}

async function uniqueAwardId(
  base: string,
  db: Db,
): Promise<string> {
  let id = base;
  let n = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: awardCategories.id })
      .from(awardCategories)
      .where(eq(awardCategories.id, id))
      .limit(1);
    if (!existing) return id;
    const suffix = `-${n}`;
    id = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    n += 1;
  }
}

export async function createAwardCategory(
  raw: Parameters<typeof parseAwardCategoryWriteInput>[0],
  db: Db = getLiveAggregateDb(),
): Promise<{ ok: true; id: string } | { error: string }> {
  const parsed = parseAwardCategoryWriteInput(raw);
  if ("error" in parsed) return parsed;
  const id = await uniqueAwardId(slugifyAwardCategoryId(parsed.label), db);
  await db.insert(awardCategories).values({
    id,
    label: parsed.label,
    description: parsed.description || null,
    sortOrder: parsed.sortOrder,
    categoryGroup: parsed.categoryGroup,
    eligibility: parsed.eligibility,
    allowEditions: parsed.allowEditions,
    allowDlcAddon: parsed.allowDlcAddon,
    currentOrPreviousYear: parsed.currentOrPreviousYear,
    active: parsed.active,
  });
  return { ok: true, id };
}

export async function updateAwardCategory(
  id: string,
  raw: Parameters<typeof parseAwardCategoryWriteInput>[0],
  db: Db = getLiveAggregateDb(),
): Promise<{ ok: true } | { error: string }> {
  const trimmed = id.trim();
  if (!trimmed) return { error: "Award not found." };
  const parsed = parseAwardCategoryWriteInput(raw);
  if ("error" in parsed) return parsed;
  const [existing] = await db
    .select({ id: awardCategories.id })
    .from(awardCategories)
    .where(eq(awardCategories.id, trimmed))
    .limit(1);
  if (!existing) return { error: "Award not found." };
  await db
    .update(awardCategories)
    .set({
      label: parsed.label,
      description: parsed.description || null,
      sortOrder: parsed.sortOrder,
      categoryGroup: parsed.categoryGroup,
      eligibility: parsed.eligibility,
      allowEditions: parsed.allowEditions,
      allowDlcAddon: parsed.allowDlcAddon,
      currentOrPreviousYear: parsed.currentOrPreviousYear,
      active: parsed.active,
    })
    .where(eq(awardCategories.id, trimmed));
  return { ok: true };
}

export async function nextAwardSortOrder(
  db: Db = getLiveAggregateDb(),
): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number>`coalesce(max(${awardCategories.sortOrder}), 0)::int`,
    })
    .from(awardCategories);
  return Number(row?.max ?? 0) + 1;
}
