import { and, asc, eq, inArray } from "drizzle-orm";
import {
  createDb,
  covers,
  games,
  listItems,
  lists,
  profiles,
  type Db,
} from "@thegamies/db";
import { coverUrlFromImageId } from "@thegamies/igdb";
import { canEditList } from "@/lib/lists/ownership";
import {
  createDraftSchema,
  replaceItemsSchema,
  updateListMetaSchema,
} from "@/lib/lists/schema";
import {
  generateEditSecret,
  generatePublicId,
  hashEditSecret,
} from "@/lib/lists/secrets";
import {
  assertWithinMaxItems,
  gotyEligibilityError,
  gotySlugForYear,
  normalizeRanks,
  slugifyListTitle,
} from "@/lib/lists/rules";
import { z } from "zod";

export type ListRow = typeof lists.$inferSelect;
export type ListItemRow = typeof listItems.$inferSelect;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateListMetaInput = z.infer<typeof updateListMetaSchema>;

export function getDb(): Db {
  return createDb();
}

function defaultGotyTitle(year: number): string {
  return `${year} Game of the Year`;
}

export async function createDraft(
  input: CreateDraftInput,
  opts: { profileId?: string | null } = {},
  db: Db = getDb(),
): Promise<
  | { list: ListRow; editSecret: string }
  | { error: string }
> {
  const parsed = createDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Check the list type, title, and year." };
  }

  const data = parsed.data;
  const publicId = generatePublicId();
  const editSecret = generateEditSecret();
  const editSecretHash = hashEditSecret(editSecret);

  const title =
    data.listType === "goty"
      ? data.title?.trim() || defaultGotyTitle(data.year)
      : data.title;

  const year = data.listType === "goty" ? data.year : (data.year ?? null);

  try {
    const [list] = await db
      .insert(lists)
      .values({
        publicId,
        editSecretHash,
        profileId: opts.profileId ?? null,
        listType: data.listType,
        title,
        year,
        status: "draft",
        slug: null,
      })
      .returning();

    return { list, editSecret };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("lists_owned_goty_year_uidx")) {
      return { error: "You already have a Game of the Year list for that year." };
    }
    throw err;
  }
}

export async function getListByPublicId(
  publicId: string,
  db: Db = getDb(),
): Promise<ListRow | null> {
  const rows = await db
    .select()
    .from(lists)
    .where(eq(lists.publicId, publicId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEditableList(
  publicId: string,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ list: ListRow; items: Awaited<ReturnType<typeof loadListItems>> } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) {
    return { error: "List not found." };
  }
  if (!canEditList(list, access)) {
    return { error: "You cannot edit this list." };
  }
  const items = await loadListItems(list.id, db);
  return { list, items };
}

async function loadListItems(listId: string, db: Db) {
  const rows = await db
    .select({
      id: listItems.id,
      rank: listItems.rank,
      gameId: games.id,
      slug: games.slug,
      title: games.title,
      year: games.year,
      coverImageId: covers.imageId,
    })
    .from(listItems)
    .innerJoin(games, eq(games.id, listItems.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(eq(listItems.listId, listId))
    .orderBy(asc(listItems.rank));

  return rows.map((r) => ({
    id: r.id,
    rank: r.rank,
    gameId: r.gameId,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: coverUrlFromImageId(r.coverImageId),
  }));
}

export async function updateListMeta(
  publicId: string,
  input: UpdateListMetaInput,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ list: ListRow } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return { error: "List not found." };
  if (!canEditList(list, access)) return { error: "You cannot edit this list." };

  const parsed = updateListMetaSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the title and year." };

  const patch: Partial<ListRow> = { updatedAt: new Date() };
  if (parsed.data.title != null) patch.title = parsed.data.title;
  if (parsed.data.year != null) {
    if (list.listType === "goty") {
      patch.year = parsed.data.year;
      if (list.profileId) {
        patch.slug = gotySlugForYear(parsed.data.year);
      }
    } else {
      patch.year = parsed.data.year;
    }
  }

  try {
    const [updated] = await db
      .update(lists)
      .set(patch)
      .where(eq(lists.id, list.id))
      .returning();
    return { list: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("lists_owned_goty_year_uidx")) {
      return { error: "You already have a Game of the Year list for that year." };
    }
    if (message.includes("lists_profile_slug_uidx")) {
      return { error: "You already have a list with that name." };
    }
    throw err;
  }
}

export async function replaceItems(
  publicId: string,
  rawItems: unknown,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ items: Awaited<ReturnType<typeof loadListItems>> } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return { error: "List not found." };
  if (!canEditList(list, access)) return { error: "You cannot edit this list." };

  const parsed = replaceItemsSchema.safeParse(rawItems);
  if (!parsed.success) {
    return { error: "Ranks must be unique and stay within the list limit." };
  }

  const over = assertWithinMaxItems(parsed.data.length);
  if (over) return { error: over };

  const normalized = normalizeRanks(parsed.data);
  if (normalized.length === 0) {
    await db.delete(listItems).where(eq(listItems.listId, list.id));
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, list.id));
    return { items: [] };
  }

  const gameIds = normalized.map((i) => i.gameId);
  const gameRows = await db
    .select({
      id: games.id,
      year: games.year,
      firstReleaseDate: games.firstReleaseDate,
      versionParentIgdbId: games.versionParentIgdbId,
      isAdult: games.isAdult,
    })
    .from(games)
    .where(inArray(games.id, gameIds));

  if (gameRows.length !== gameIds.length) {
    return { error: "One or more games could not be found." };
  }

  if (list.listType === "goty") {
    if (list.year == null) {
      return { error: "This GOTY list needs a year." };
    }
    for (const game of gameRows) {
      const err = gotyEligibilityError(game, list.year);
      if (err) return { error: err };
    }
  }

  await db.delete(listItems).where(eq(listItems.listId, list.id));
  await db.insert(listItems).values(
    normalized.map((item) => ({
      listId: list.id,
      gameId: item.gameId,
      rank: item.rank,
    })),
  );
  await db
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, list.id));

  return { items: await loadListItems(list.id, db) };
}

export async function publishList(
  publicId: string,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ list: ListRow } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return { error: "List not found." };
  if (!canEditList(list, access)) return { error: "You cannot edit this list." };

  const items = await db
    .select({ id: listItems.id })
    .from(listItems)
    .where(eq(listItems.listId, list.id))
    .limit(1);
  if (items.length === 0) {
    return { error: "Add at least one game before publishing." };
  }

  const [updated] = await db
    .update(lists)
    .set({
      status: "published",
      publishedAt: list.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(lists.id, list.id))
    .returning();

  return { list: updated };
}

export async function claimList(
  publicId: string,
  opts: {
    profileId: string;
    editSecret?: string | null;
  },
  db: Db = getDb(),
): Promise<{ list: ListRow } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return { error: "List not found." };

  if (list.profileId && list.profileId !== opts.profileId) {
    return { error: "This list already belongs to someone else." };
  }

  if (
    !canEditList(list, {
      profileId: opts.profileId,
      editSecret: opts.editSecret,
    })
  ) {
    return { error: "You cannot claim this list." };
  }

  if (list.listType === "goty") {
    if (list.year == null) {
      return { error: "This GOTY list needs a year before it can be saved." };
    }
    const existing = await db
      .select({ id: lists.id })
      .from(lists)
      .where(
        and(
          eq(lists.profileId, opts.profileId),
          eq(lists.listType, "goty"),
          eq(lists.year, list.year),
        ),
      )
      .limit(1);
    if (existing[0] && existing[0].id !== list.id) {
      return {
        error: "You already have a Game of the Year list for that year.",
      };
    }
  }

  let slug =
    list.listType === "goty" && list.year != null
      ? gotySlugForYear(list.year)
      : slugifyListTitle(list.title);

  if (list.listType === "custom") {
    const clash = await db
      .select({ id: lists.id })
      .from(lists)
      .where(
        and(eq(lists.profileId, opts.profileId), eq(lists.slug, slug)),
      )
      .limit(1);
    if (clash[0] && clash[0].id !== list.id) {
      slug = `${slug}-${list.publicId.slice(0, 4)}`;
    }
  }

  try {
    const [updated] = await db
      .update(lists)
      .set({
        profileId: opts.profileId,
        slug,
        editSecretHash: null,
        updatedAt: new Date(),
      })
      .where(eq(lists.id, list.id))
      .returning();
    return { list: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("lists_owned_goty_year_uidx")) {
      return { error: "You already have a Game of the Year list for that year." };
    }
    if (message.includes("lists_profile_slug_uidx")) {
      return { error: "You already have a list with that name." };
    }
    throw err;
  }
}

export async function resetDraft(
  publicId: string,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return { error: "List not found." };
  if (!canEditList(list, access)) return { error: "You cannot reset this list." };
  if (list.status !== "draft") {
    return { error: "Only drafts can be reset." };
  }

  await db.delete(lists).where(eq(lists.id, list.id));
  return { ok: true };
}

export async function getPublishedByPublicId(
  publicId: string,
  db: Db = getDb(),
) {
  const list = await getListByPublicId(publicId, db);
  if (!list || list.status !== "published") return null;

  const items = await loadListItems(list.id, db);
  let owner: { username: string; displayName: string } | null = null;
  if (list.profileId) {
    const [profile] = await db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(eq(profiles.id, list.profileId))
      .limit(1);
    if (profile) {
      owner = {
        username: profile.username,
        displayName: profile.displayName,
      };
    }
  }

  return { list, items, owner };
}

export async function listPublishedForProfile(
  profileId: string,
  db: Db = getDb(),
) {
  return db
    .select({
      publicId: lists.publicId,
      title: lists.title,
      year: lists.year,
      listType: lists.listType,
      slug: lists.slug,
      publishedAt: lists.publishedAt,
    })
    .from(lists)
    .where(
      and(
        eq(lists.profileId, profileId),
        eq(lists.status, "published"),
      ),
    )
    .orderBy(asc(lists.year), asc(lists.title));
}

export async function peekDraftFromCookie(
  cookie: { publicId: string; secret: string } | null,
  db: Db = getDb(),
): Promise<ListRow | null> {
  if (!cookie) return null;
  const list = await getListByPublicId(cookie.publicId, db);
  if (!list || list.status !== "draft") return null;
  if (!canEditList(list, { editSecret: cookie.secret })) return null;
  return list;
}
