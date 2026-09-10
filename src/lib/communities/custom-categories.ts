import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  communityCustomCategories,
  communityCustomCategoryEntries,
  communityEditionBallotCustomCategoryVotes,
  communityEditionCategories,
  covers,
  createDb,
  games,
  type CommunityCustomAnswerType,
  type CommunityCustomSupportLinkKind,
  type Db,
} from "@thegamies/db";
import {
  isSupportVideoParseOk,
  parseSupportVideoLink,
} from "@/lib/media/support-video-link";
import {
  CUSTOM_ANSWER_TYPES,
  CUSTOM_CATEGORIES_PER_EDITION_MAX,
  CUSTOM_CATEGORY_DESCRIPTION_MAX,
  CUSTOM_CATEGORY_NAME_MAX,
  CUSTOM_ENTRIES_PER_CATEGORY_MAX,
  CUSTOM_ENTRY_DESCRIPTION_MAX,
  CUSTOM_ENTRY_TITLE_MAX,
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
  type CustomCategoryEntryView,
  type CustomCategoryView,
} from "./custom-category-types";
import { clientSafeCustomCategoryError } from "./custom-category-errors";
import { editionCategoriesWriteBlockedReason } from "./edition-categories";
import { computeEditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";
import { categoryEligibilityError } from "@/lib/live-aggregate/category-eligibility";

export type {
  CustomCategoryEntryView,
  CustomCategoryView,
} from "./custom-category-types";
export {
  CUSTOM_ANSWER_TYPES,
  CUSTOM_CATEGORIES_PER_EDITION_MAX,
  CUSTOM_CATEGORY_DESCRIPTION_MAX,
  CUSTOM_CATEGORY_NAME_MAX,
  CUSTOM_ELIGIBILITIES,
  CUSTOM_ENTRIES_PER_CATEGORY_MAX,
  CUSTOM_ENTRY_DESCRIPTION_MAX,
  CUSTOM_ENTRY_TITLE_MAX,
  customAnswerTypeUsesEligibility,
  parseCustomCategoryEligibility,
} from "./custom-category-types";

function getDb(): Db {
  return createDb();
}

function coverUrlFromImageId(imageId: string | null): string | null {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
    : null;
}

async function requireHostEdition(input: {
  slug: string;
  year: number;
  profileId: string;
  db?: Db;
}) {
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
  const status = computeEditionStatus(edition);
  const blocked = editionCategoriesWriteBlockedReason(status);
  if (blocked) throw new Error(blocked);
  return { db, community, edition, status };
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function assertAnswerType(
  value: string,
): asserts value is CommunityCustomAnswerType {
  if (!(CUSTOM_ANSWER_TYPES as readonly string[]).includes(value)) {
    throw new Error("Choose a valid answer type.");
  }
}

export async function listCustomCategoriesForEdition(
  editionId: string,
  db: Db = getDb(),
): Promise<CustomCategoryView[]> {
  const cats = await db
    .select()
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, editionId))
    .orderBy(
      asc(communityCustomCategories.sortOrder),
      asc(communityCustomCategories.createdAt),
    );

  if (cats.length === 0) return [];

  const catIds = cats.map((c) => c.id);
  const entryRows = await db
    .select({
      id: communityCustomCategoryEntries.id,
      categoryId: communityCustomCategoryEntries.categoryId,
      title: communityCustomCategoryEntries.title,
      description: communityCustomCategoryEntries.description,
      imageUrl: communityCustomCategoryEntries.imageUrl,
      gameId: communityCustomCategoryEntries.gameId,
      supportLinkUrl: communityCustomCategoryEntries.supportLinkUrl,
      supportLinkKind: communityCustomCategoryEntries.supportLinkKind,
      sortOrder: communityCustomCategoryEntries.sortOrder,
      entrySource: communityCustomCategoryEntries.entrySource,
      gameTitle: games.title,
      gameSlug: games.slug,
      coverImageId: covers.imageId,
    })
    .from(communityCustomCategoryEntries)
    .leftJoin(games, eq(games.id, communityCustomCategoryEntries.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(inArray(communityCustomCategoryEntries.categoryId, catIds))
    .orderBy(
      asc(communityCustomCategoryEntries.sortOrder),
      asc(communityCustomCategoryEntries.createdAt),
    );

  const byCat = new Map<string, CustomCategoryEntryView[]>();
  for (const row of entryRows) {
    const list = byCat.get(row.categoryId) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      gameId: row.gameId,
      gameTitle: row.gameTitle,
      gameSlug: row.gameSlug,
      coverUrl: coverUrlFromImageId(row.coverImageId),
      supportLinkUrl: row.supportLinkUrl,
      supportLinkKind: row.supportLinkKind,
      sortOrder: row.sortOrder,
      entrySource: row.entrySource,
    });
    byCat.set(row.categoryId, list);
  }

  return cats.map((c) => ({
    id: c.id,
    editionId: c.editionId,
    name: c.name,
    description: c.description,
    imageUrl: c.imageUrl,
    answerType: c.answerType,
    eligibility: parseCustomCategoryEligibility(c.eligibility),
    sortOrder: c.sortOrder,
    entries: byCat.get(c.id) ?? [],
  }));
}

export async function createCustomCategory(input: {
  slug: string;
  year: number;
  profileId: string;
  name: string;
  description: string;
  answerType: string;
  eligibility?: string | null;
  imageUrl?: string | null;
}): Promise<CustomCategoryView> {
  const { db, edition } = await requireHostEdition(input);
  assertAnswerType(input.answerType);
  const name = normalizeName(input.name);
  const description = input.description.trim();
  if (!name) throw new Error("Enter a category name.");
  if (name.length > CUSTOM_CATEGORY_NAME_MAX) {
    throw new Error(`Category name must be ${CUSTOM_CATEGORY_NAME_MAX} characters or fewer.`);
  }
  if (!description) throw new Error("Explain what qualifies for this category.");
  if (description.length > CUSTOM_CATEGORY_DESCRIPTION_MAX) {
    throw new Error(
      `Description must be ${CUSTOM_CATEGORY_DESCRIPTION_MAX} characters or fewer.`,
    );
  }

  const eligibility = customAnswerTypeUsesEligibility(input.answerType)
    ? parseCustomCategoryEligibility(input.eligibility)
    : "current_year";

  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, edition.id));
  if (count >= CUSTOM_CATEGORIES_PER_EDITION_MAX) {
    throw new Error(
      `An event can have at most ${CUSTOM_CATEGORIES_PER_EDITION_MAX} community categories.`,
    );
  }

  const [{ siteMax }] = await db
    .select({
      siteMax: sql<number>`coalesce(max(${communityEditionCategories.sortOrder}), -1)::int`,
    })
    .from(communityEditionCategories)
    .where(eq(communityEditionCategories.editionId, edition.id));
  const [{ customMax }] = await db
    .select({
      customMax: sql<number>`coalesce(max(${communityCustomCategories.sortOrder}), -1)::int`,
    })
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, edition.id));
  const sortOrder = Math.max(siteMax ?? -1, customMax ?? -1) + 1;

  try {
    const [row] = await db
      .insert(communityCustomCategories)
      .values({
        editionId: edition.id,
        name,
        description,
        answerType: input.answerType,
        eligibility,
        imageUrl: input.imageUrl ?? null,
        sortOrder,
        updatedAt: new Date(),
      })
      .returning();
    return {
      id: row.id,
      editionId: row.editionId,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      answerType: row.answerType,
      eligibility: parseCustomCategoryEligibility(row.eligibility),
      sortOrder: row.sortOrder,
      entries: [],
    };
  } catch (err) {
    throw new Error(
      clientSafeCustomCategoryError(err, "Could not create category."),
    );
  }
}

export async function updateCustomCategory(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryId: string;
  name: string;
  description: string;
  eligibility?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const name = normalizeName(input.name);
  const description = input.description.trim();
  if (!name) throw new Error("Enter a category name.");
  if (name.length > CUSTOM_CATEGORY_NAME_MAX) {
    throw new Error(`Category name must be ${CUSTOM_CATEGORY_NAME_MAX} characters or fewer.`);
  }
  if (!description) throw new Error("Explain what qualifies for this category.");
  if (description.length > CUSTOM_CATEGORY_DESCRIPTION_MAX) {
    throw new Error(
      `Description must be ${CUSTOM_CATEGORY_DESCRIPTION_MAX} characters or fewer.`,
    );
  }

  const [existing] = await db
    .select()
    .from(communityCustomCategories)
    .where(
      and(
        eq(communityCustomCategories.id, input.categoryId),
        eq(communityCustomCategories.editionId, edition.id),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Category not found.");

  const eligibility = customAnswerTypeUsesEligibility(existing.answerType)
    ? parseCustomCategoryEligibility(
        input.eligibility ?? existing.eligibility,
      )
    : existing.eligibility;

  try {
    await db
      .update(communityCustomCategories)
      .set({
        name,
        description,
        eligibility,
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(communityCustomCategories.id, input.categoryId));
  } catch (err) {
    throw new Error(
      clientSafeCustomCategoryError(err, "Could not update category."),
    );
  }
}

export async function setCustomCategoryImageUrl(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryId: string;
  imageUrl: string | null;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const updated = await db
    .update(communityCustomCategories)
    .set({ imageUrl: input.imageUrl, updatedAt: new Date() })
    .where(
      and(
        eq(communityCustomCategories.id, input.categoryId),
        eq(communityCustomCategories.editionId, edition.id),
      ),
    )
    .returning({ id: communityCustomCategories.id });
  if (updated.length === 0) throw new Error("Category not found.");
}

export async function deleteCustomCategory(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryId: string;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const [existing] = await db
    .select()
    .from(communityCustomCategories)
    .where(
      and(
        eq(communityCustomCategories.id, input.categoryId),
        eq(communityCustomCategories.editionId, edition.id),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Category not found.");
  await db
    .delete(communityCustomCategories)
    .where(eq(communityCustomCategories.id, input.categoryId));
}

export async function reorderCustomCategories(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryIds: string[];
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const existing = await db
    .select({ id: communityCustomCategories.id })
    .from(communityCustomCategories)
    .where(eq(communityCustomCategories.editionId, edition.id));
  const existingIds = new Set(existing.map((r) => r.id));
  if (
    input.categoryIds.length !== existingIds.size ||
    input.categoryIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Category order is out of date. Refresh and try again.");
  }
  for (let i = 0; i < input.categoryIds.length; i++) {
    await db
      .update(communityCustomCategories)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(communityCustomCategories.id, input.categoryIds[i]!));
  }
}

function parseOptionalSupportLink(raw: string | null | undefined): {
  supportLinkUrl: string | null;
  supportLinkKind: CommunityCustomSupportLinkKind | null;
} {
  if (raw == null || !raw.trim()) {
    return { supportLinkUrl: null, supportLinkKind: null };
  }
  const parsed = parseSupportVideoLink(raw);
  if (!isSupportVideoParseOk(parsed)) {
    throw new Error(parsed.error);
  }
  return {
    supportLinkUrl: parsed.canonicalUrl,
    supportLinkKind: parsed.kind,
  };
}

export async function createCustomCategoryEntry(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  gameId?: string | null;
  imageUrl?: string | null;
  supportLinkUrl?: string | null;
}): Promise<CustomCategoryEntryView> {
  const { db, edition } = await requireHostEdition(input);
  const [cat] = await db
    .select()
    .from(communityCustomCategories)
    .where(
      and(
        eq(communityCustomCategories.id, input.categoryId),
        eq(communityCustomCategories.editionId, edition.id),
      ),
    )
    .limit(1);
  if (!cat) throw new Error("Category not found.");
  if (cat.answerType === "any_game") {
    throw new Error("Any Game categories do not use a fixed entry list.");
  }

  const title = normalizeName(input.title);
  if (!title) throw new Error("Enter an entry title.");
  if (title.length > CUSTOM_ENTRY_TITLE_MAX) {
    throw new Error(`Title must be ${CUSTOM_ENTRY_TITLE_MAX} characters or fewer.`);
  }
  const description =
    input.description?.trim() ?
      input.description.trim().slice(0, CUSTOM_ENTRY_DESCRIPTION_MAX)
    : null;
  if (description && description.length > CUSTOM_ENTRY_DESCRIPTION_MAX) {
    throw new Error(
      `Description must be ${CUSTOM_ENTRY_DESCRIPTION_MAX} characters or fewer.`,
    );
  }

  let gameId: string | null = input.gameId ?? null;
  if (cat.answerType === "text_only") {
    gameId = null;
  } else if (cat.answerType === "selected_games" || cat.answerType === "text_game") {
    if (!gameId) throw new Error("Choose an associated game.");
  }

  if (gameId && cat.answerType === "selected_games") {
    const [dup] = await db
      .select({ id: communityCustomCategoryEntries.id })
      .from(communityCustomCategoryEntries)
      .where(
        and(
          eq(communityCustomCategoryEntries.categoryId, cat.id),
          eq(communityCustomCategoryEntries.gameId, gameId),
        ),
      )
      .limit(1);
    if (dup) {
      throw new Error("That game is already an entry in this category.");
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(communityCustomCategoryEntries)
    .where(eq(communityCustomCategoryEntries.categoryId, cat.id));
  if (count >= CUSTOM_ENTRIES_PER_CATEGORY_MAX) {
    throw new Error(
      `A category can have at most ${CUSTOM_ENTRIES_PER_CATEGORY_MAX} entries.`,
    );
  }

  const [{ maxSort }] = await db
    .select({
      maxSort: sql<number>`coalesce(max(${communityCustomCategoryEntries.sortOrder}), -1)::int`,
    })
    .from(communityCustomCategoryEntries)
    .where(eq(communityCustomCategoryEntries.categoryId, cat.id));

  const link = parseOptionalSupportLink(input.supportLinkUrl);

  let gameTitle: string | null = null;
  let gameSlug: string | null = null;
  let coverUrl: string | null = null;
  if (gameId) {
    const [g] = await db
      .select({
        title: games.title,
        slug: games.slug,
        coverImageId: covers.imageId,
        year: games.year,
        firstReleaseDate: games.firstReleaseDate,
        versionParentIgdbId: games.versionParentIgdbId,
        isAdult: games.isAdult,
        gameTypeIgdbId: games.gameTypeIgdbId,
      })
      .from(games)
      .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
      .where(eq(games.id, gameId))
      .limit(1);
    if (!g) throw new Error("Game not found.");
    if (cat.answerType === "selected_games") {
      const err = categoryEligibilityError(
        { id: gameId, ...g },
        edition.year,
        parseCustomCategoryEligibility(cat.eligibility),
      );
      if (err) throw new Error(err);
    }
    gameTitle = g.title;
    gameSlug = g.slug;
    coverUrl = coverUrlFromImageId(g.coverImageId);
  }

  try {
    const [row] = await db
      .insert(communityCustomCategoryEntries)
      .values({
        categoryId: cat.id,
        title,
        description,
        gameId,
        imageUrl: input.imageUrl ?? null,
        supportLinkUrl: link.supportLinkUrl,
        supportLinkKind: link.supportLinkKind,
        sortOrder: maxSort + 1,
        entrySource: "host",
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      gameId: row.gameId,
      gameTitle,
      gameSlug,
      coverUrl,
      supportLinkUrl: row.supportLinkUrl,
      supportLinkKind: row.supportLinkKind,
      sortOrder: row.sortOrder,
      entrySource: row.entrySource,
    };
  } catch (err) {
    throw new Error(clientSafeCustomCategoryError(err, "Could not add entry."));
  }
}

export async function updateCustomCategoryEntry(input: {
  slug: string;
  year: number;
  profileId: string;
  entryId: string;
  title: string;
  description?: string | null;
  gameId?: string | null;
  imageUrl?: string | null;
  supportLinkUrl?: string | null;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const [entry] = await db
    .select({
      id: communityCustomCategoryEntries.id,
      categoryId: communityCustomCategoryEntries.categoryId,
      answerType: communityCustomCategories.answerType,
      eligibility: communityCustomCategories.eligibility,
      editionId: communityCustomCategories.editionId,
    })
    .from(communityCustomCategoryEntries)
    .innerJoin(
      communityCustomCategories,
      eq(communityCustomCategories.id, communityCustomCategoryEntries.categoryId),
    )
    .where(eq(communityCustomCategoryEntries.id, input.entryId))
    .limit(1);
  if (!entry || entry.editionId !== edition.id) {
    throw new Error("Entry not found.");
  }

  const title = normalizeName(input.title);
  if (!title) throw new Error("Enter an entry title.");
  if (title.length > CUSTOM_ENTRY_TITLE_MAX) {
    throw new Error(`Title must be ${CUSTOM_ENTRY_TITLE_MAX} characters or fewer.`);
  }
  const description =
    input.description?.trim() ?
      input.description.trim().slice(0, CUSTOM_ENTRY_DESCRIPTION_MAX)
    : null;

  let gameId: string | null | undefined = input.gameId;
  if (entry.answerType === "text_only") {
    gameId = null;
  } else if (
    (entry.answerType === "selected_games" || entry.answerType === "text_game") &&
    input.gameId !== undefined
  ) {
    if (!input.gameId) throw new Error("Choose an associated game.");
    gameId = input.gameId;
  }

  if (gameId && entry.answerType === "selected_games") {
    const [dup] = await db
      .select({ id: communityCustomCategoryEntries.id })
      .from(communityCustomCategoryEntries)
      .where(
        and(
          eq(communityCustomCategoryEntries.categoryId, entry.categoryId),
          eq(communityCustomCategoryEntries.gameId, gameId),
          ne(communityCustomCategoryEntries.id, entry.id),
        ),
      )
      .limit(1);
    if (dup) {
      throw new Error("That game is already an entry in this category.");
    }
    const [g] = await db
      .select({
        year: games.year,
        firstReleaseDate: games.firstReleaseDate,
        versionParentIgdbId: games.versionParentIgdbId,
        isAdult: games.isAdult,
        gameTypeIgdbId: games.gameTypeIgdbId,
      })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (!g) throw new Error("Game not found.");
    const err = categoryEligibilityError(
      { id: gameId, ...g },
      edition.year,
      parseCustomCategoryEligibility(entry.eligibility),
    );
    if (err) throw new Error(err);
  }

  const link =
    input.supportLinkUrl !== undefined
      ? parseOptionalSupportLink(input.supportLinkUrl)
      : null;

  try {
    await db
      .update(communityCustomCategoryEntries)
      .set({
        title,
        description,
        ...(gameId !== undefined ? { gameId } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(link
          ? {
              supportLinkUrl: link.supportLinkUrl,
              supportLinkKind: link.supportLinkKind,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(communityCustomCategoryEntries.id, entry.id));
  } catch (err) {
    throw new Error(
      clientSafeCustomCategoryError(err, "Could not update entry."),
    );
  }
}

export async function deleteCustomCategoryEntry(input: {
  slug: string;
  year: number;
  profileId: string;
  entryId: string;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const [entry] = await db
    .select({
      id: communityCustomCategoryEntries.id,
      editionId: communityCustomCategories.editionId,
    })
    .from(communityCustomCategoryEntries)
    .innerJoin(
      communityCustomCategories,
      eq(communityCustomCategories.id, communityCustomCategoryEntries.categoryId),
    )
    .where(eq(communityCustomCategoryEntries.id, input.entryId))
    .limit(1);
  if (!entry || entry.editionId !== edition.id) {
    throw new Error("Entry not found.");
  }
  await db
    .delete(communityCustomCategoryEntries)
    .where(eq(communityCustomCategoryEntries.id, entry.id));
}

export async function reorderCustomCategoryEntries(input: {
  slug: string;
  year: number;
  profileId: string;
  categoryId: string;
  entryIds: string[];
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const [cat] = await db
    .select()
    .from(communityCustomCategories)
    .where(
      and(
        eq(communityCustomCategories.id, input.categoryId),
        eq(communityCustomCategories.editionId, edition.id),
      ),
    )
    .limit(1);
  if (!cat) throw new Error("Category not found.");

  const existing = await db
    .select({ id: communityCustomCategoryEntries.id })
    .from(communityCustomCategoryEntries)
    .where(eq(communityCustomCategoryEntries.categoryId, cat.id));
  const existingIds = new Set(existing.map((r) => r.id));
  if (
    input.entryIds.length !== existingIds.size ||
    input.entryIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Entry order is out of date. Refresh and try again.");
  }
  for (let i = 0; i < input.entryIds.length; i++) {
    await db
      .update(communityCustomCategoryEntries)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(communityCustomCategoryEntries.id, input.entryIds[i]!));
  }
}

export async function setCustomCategoryEntryImageUrl(input: {
  slug: string;
  year: number;
  profileId: string;
  entryId: string;
  imageUrl: string | null;
}): Promise<void> {
  const { db, edition } = await requireHostEdition(input);
  const [entry] = await db
    .select({
      id: communityCustomCategoryEntries.id,
      editionId: communityCustomCategories.editionId,
    })
    .from(communityCustomCategoryEntries)
    .innerJoin(
      communityCustomCategories,
      eq(communityCustomCategories.id, communityCustomCategoryEntries.categoryId),
    )
    .where(eq(communityCustomCategoryEntries.id, input.entryId))
    .limit(1);
  if (!entry || entry.editionId !== edition.id) {
    throw new Error("Entry not found.");
  }
  await db
    .update(communityCustomCategoryEntries)
    .set({ imageUrl: input.imageUrl, updatedAt: new Date() })
    .where(eq(communityCustomCategoryEntries.id, entry.id));
}

/** Drop custom category votes for categories no longer on the edition (defensive). */
export async function purgeOrphanCustomCategoryVotes(
  ballotId: string,
  validCategoryIds: readonly string[],
  db: Db = getDb(),
): Promise<void> {
  if (validCategoryIds.length === 0) {
    await db
      .delete(communityEditionBallotCustomCategoryVotes)
      .where(eq(communityEditionBallotCustomCategoryVotes.ballotId, ballotId));
    return;
  }
  await db.execute(sql`
    delete from community_edition_ballot_custom_category_votes
    where ballot_id = ${ballotId}
      and category_id not in (${sql.join(
        validCategoryIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
  `);
}
