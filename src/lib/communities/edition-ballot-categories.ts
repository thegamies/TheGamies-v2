import { and, asc, eq, sql } from "drizzle-orm";
import {
  communityCustomCategories,
  communityEditionCategories,
  createDb,
  type Db,
} from "@thegamies/db";
import type { EditionBallotCategoryRef } from "./custom-category-types";
import {
  editionCategoriesWriteBlockedReason,
} from "./edition-categories";
import { listCustomCategoriesForEdition } from "./custom-categories";
import { listEditionAwardCategories } from "./edition-categories";
import { computeEditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";
import type { CustomCategoryView } from "./custom-category-types";

function getDb(): Db {
  return createDb();
}

export type EditionBallotSiteCategory = {
  kind: "site";
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  categoryGroup: string;
  eligibility: string;
  allowEditions: boolean;
};

export type EditionBallotCustomCategory = {
  kind: "custom";
  id: string;
  label: string;
  description: string;
  sortOrder: number;
  category: CustomCategoryView;
};

export type EditionBallotCategoryItem =
  | EditionBallotSiteCategory
  | EditionBallotCustomCategory;

/** Merge site + custom into one list ordered by shared sortOrder. */
export function mergeEditionBallotCategories(input: {
  site: Array<{
    id: string;
    label: string;
    description: string | null;
    sortOrder: number;
    categoryGroup: string;
    eligibility: string;
    allowEditions: boolean;
  }>;
  custom: CustomCategoryView[];
}): EditionBallotCategoryItem[] {
  const items: EditionBallotCategoryItem[] = [
    ...input.site.map(
      (c): EditionBallotSiteCategory => ({
        kind: "site",
        id: c.id,
        label: c.label,
        description: c.description,
        sortOrder: c.sortOrder,
        categoryGroup: c.categoryGroup,
        eligibility: c.eligibility,
        allowEditions: c.allowEditions,
      }),
    ),
    ...input.custom.map(
      (c): EditionBallotCustomCategory => ({
        kind: "custom",
        id: c.id,
        label: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        category: c,
      }),
    ),
  ];
  items.sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      (a.kind === b.kind ? 0 : a.kind === "site" ? -1 : 1) ||
      a.id.localeCompare(b.id),
  );
  return items;
}

export async function listEditionBallotCategories(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionBallotCategoryItem[]> {
  const [site, custom] = await Promise.all([
    listEditionAwardCategories(editionId, db),
    listCustomCategoriesForEdition(editionId, db),
  ]);
  return mergeEditionBallotCategories({ site, custom });
}

export async function nextEditionBallotSortOrder(
  editionId: string,
  db: Db = getDb(),
): Promise<number> {
  const [siteMax] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${communityEditionCategories.sortOrder}), -1)::int`,
    })
    .from(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, editionId));
  const [customMax] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${communityCustomCategories.sortOrder}), -1)::int`,
    })
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, editionId));
  return Math.max(siteMax?.maxSort ?? -1, customMax?.maxSort ?? -1) + 1;
}

/**
 * Write shared sort_order for an interleaved site + custom list.
 * Validates every id belongs to the edition.
 */
export async function reorderEditionBallotCategories(input: {
  slug: string;
  year: number;
  profileId: string;
  items: EditionBallotCategoryRef[];
  db?: Db;
}): Promise<void> {
  const db = input.db ?? getDb();
  const community = await getCommunityBySlug(input.slug, input.profileId, db);
  if (!community) throw new Error("Community not found.");
  if (!canManageCommunity(community.viewerRole)) {
    throw new Error("Only hosts can manage categories.");
  }
  const edition = await getEditionByCommunityYear(
    community.id,
    input.year,
    db,
  );
  if (!edition) throw new Error("Event not found.");
  const blocked = editionCategoriesWriteBlockedReason(
    computeEditionStatus(edition),
  );
  if (blocked) throw new Error(blocked);

  const siteRows = await db
    .select({ categoryId: communityEditionCategories.categoryId })
    .from(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, edition.id));
  const customRows = await db
    .select({ id: communityCustomCategories.id })
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, edition.id));

  const siteIds = new Set(siteRows.map((r) => r.categoryId));
  const customIds = new Set(customRows.map((r) => r.id));

  const seen = new Set<string>();
  for (const item of input.items) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) {
      throw new Error("Category order is out of date. Refresh and try again.");
    }
    seen.add(key);
    if (item.kind === "site") {
      if (!siteIds.has(item.id)) {
        throw new Error("Category order is out of date. Refresh and try again.");
      }
    } else if (!customIds.has(item.id)) {
      throw new Error("Category order is out of date. Refresh and try again.");
    }
  }

  // Every persisted category must appear exactly once.
  if (seen.size !== siteIds.size + customIds.size) {
    throw new Error("Category order is out of date. Refresh and try again.");
  }
  for (const id of siteIds) {
    if (!seen.has(`site:${id}`)) {
      throw new Error("Category order is out of date. Refresh and try again.");
    }
  }
  for (const id of customIds) {
    if (!seen.has(`custom:${id}`)) {
      throw new Error("Category order is out of date. Refresh and try again.");
    }
  }

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i]!;
    if (item.kind === "site") {
      await db
        .update(communityEditionCategories)
        .set({ sortOrder: i })
        .where(
          and(
            eq(communityEditionCategories.editionId, edition.id),
            eq(communityEditionCategories.categoryId, item.id),
          ),
        );
    } else {
      await db
        .update(communityCustomCategories)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(communityCustomCategories.editionId, edition.id),
            eq(communityCustomCategories.id, item.id),
          ),
        );
    }
  }
}

export function parseBallotOrderJson(
  raw: unknown,
): EditionBallotCategoryRef[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: EditionBallotCategoryRef[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") return null;
      const kind = (row as { kind?: unknown }).kind;
      const id = String((row as { id?: unknown }).id ?? "").trim();
      if ((kind !== "site" && kind !== "custom") || !id) return null;
      out.push({ kind, id });
    }
    return out;
  } catch {
    return null;
  }
}

/** `{ [categoryId]: entryIds[] }` from edition settings Save. */
export function parseEntryOrdersJson(
  raw: unknown,
): Array<{ categoryId: string; entryIds: string[] }> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const out: Array<{ categoryId: string; entryIds: string[] }> = [];
    for (const [categoryIdRaw, idsRaw] of Object.entries(parsed)) {
      const categoryId = categoryIdRaw.trim();
      if (!categoryId || !Array.isArray(idsRaw)) return null;
      const entryIds = idsRaw.map((id) => String(id).trim()).filter(Boolean);
      if (entryIds.length !== idsRaw.length) return null;
      out.push({ categoryId, entryIds });
    }
    return out;
  } catch {
    return null;
  }
}

export type CustomCategoryCreateDraft = {
  localId: string;
  name: string;
  description: string;
  answerType: string;
  eligibility: string | null;
  entries: Array<{
    title: string;
    description: string | null;
    gameId: string | null;
    supportLinkUrl: string | null;
  }>;
};

/** Draft community categories from Create Event (before edition exists). */
export function parseCustomCategoriesDraftJson(
  raw: unknown,
): CustomCategoryCreateDraft[] | null {
  if (typeof raw !== "string") return null;
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: CustomCategoryCreateDraft[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") return null;
      const localId = String((row as { localId?: unknown }).localId ?? "").trim();
      const name = String((row as { name?: unknown }).name ?? "").trim();
      const description = String(
        (row as { description?: unknown }).description ?? "",
      ).trim();
      const answerType = String(
        (row as { answerType?: unknown }).answerType ?? "",
      ).trim();
      const eligibilityRaw = (row as { eligibility?: unknown }).eligibility;
      const eligibility =
        eligibilityRaw == null || eligibilityRaw === ""
          ? null
          : String(eligibilityRaw).trim();
      const entriesRaw = (row as { entries?: unknown }).entries;
      if (!localId || !name || !description || !answerType) return null;
      if (!Array.isArray(entriesRaw)) return null;
      const entries: CustomCategoryCreateDraft["entries"] = [];
      for (const entry of entriesRaw) {
        if (!entry || typeof entry !== "object") return null;
        const title = String((entry as { title?: unknown }).title ?? "").trim();
        if (!title) return null;
        const descriptionRaw = (entry as { description?: unknown }).description;
        const gameIdRaw = (entry as { gameId?: unknown }).gameId;
        const supportRaw = (entry as { supportLinkUrl?: unknown }).supportLinkUrl;
        entries.push({
          title,
          description:
            descriptionRaw == null || descriptionRaw === ""
              ? null
              : String(descriptionRaw),
          gameId:
            gameIdRaw == null || gameIdRaw === ""
              ? null
              : String(gameIdRaw).trim(),
          supportLinkUrl:
            supportRaw == null || supportRaw === ""
              ? null
              : String(supportRaw).trim(),
        });
      }
      out.push({
        localId,
        name,
        description,
        answerType,
        eligibility,
        entries,
      });
    }
    return out;
  } catch {
    return null;
  }
}
