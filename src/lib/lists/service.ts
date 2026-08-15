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
import { shareLinkPublishError } from "@/lib/lists/auth-intent";
import {
  clientDraftUpsertSchema,
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
import { listSharePath } from "@/lib/lists/urls";
import {
  clearOwnedGotyContrib,
  syncOwnedGotyContribFromList,
} from "@/lib/live-aggregate/contrib";
import { scheduleYearRefresh } from "@/lib/live-aggregate/refresh";
import { z } from "zod";

export type ListRow = typeof lists.$inferSelect;
export type ListItemRow = typeof listItems.$inferSelect;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateListMetaInput = z.infer<typeof updateListMetaSchema>;

export function getDb(): Db {
  return createDb();
}

/** Contrib-on-save; score refresh is scheduled (non-blocking). */
export async function syncLiveAggregateForOwnedList(
  list: ListRow,
  db: Db = getDb(),
): Promise<void> {
  try {
    if (list.listType === "goty" && list.profileId && list.year != null) {
      const result = await syncOwnedGotyContribFromList(list.id, db);
      if ("error" in result) return;
      scheduleYearRefresh(result.years);
      return;
    }
    const cleared = await clearOwnedGotyContrib(list.id, db);
    scheduleYearRefresh(cleared.years);
  } catch {
    // List write already succeeded; standings catch up on next save/read/rebuild.
  }
}

async function syncLiveAggregateForList(
  list: ListRow,
  db: Db,
): Promise<void> {
  await syncLiveAggregateForOwnedList(list, db);
}

function defaultGotyTitle(year: number): string {
  return `${year} Game of the Year`;
}

export async function createDraft(
  input: CreateDraftInput,
  opts: { profileId?: string | null } = {},
  db: Db = getDb(),
): Promise<
  | { list: ListRow; editSecret: string | null }
  | { error: string }
> {
  const parsed = createDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Check the list type, title, and year." };
  }

  const data = parsed.data;
  if (data.listType === "goty" && opts.profileId) {
    const existing = await getOwnedGotyForYear(opts.profileId, data.year, db);
    if (existing) {
      return {
        error: "You already have a Game of the Year list for that year.",
      };
    }
  }

  const publicId = generatePublicId();
  const owned = Boolean(opts.profileId);
  const editSecret = owned ? null : generateEditSecret();
  const editSecretHash = editSecret ? hashEditSecret(editSecret) : null;

  const title =
    data.listType === "goty"
      ? data.title?.trim() || defaultGotyTitle(data.year)
      : data.title;

  const year = data.listType === "goty" ? data.year : (data.year ?? null);

  let slug: string | null = null;
  if (owned && opts.profileId) {
    if (data.listType === "goty") {
      slug = gotySlugForYear(data.year);
    } else {
      slug = slugifyListTitle(title);
      const clash = await db
        .select({ id: lists.id })
        .from(lists)
        .where(and(eq(lists.profileId, opts.profileId), eq(lists.slug, slug)))
        .limit(1);
      if (clash[0]) {
        slug = `${slug}-${publicId.slice(0, 4)}`;
      }
    }
  }

  try {
    const now = new Date();
    const [list] = await db
      .insert(lists)
      .values({
        publicId,
        editSecretHash,
        profileId: opts.profileId ?? null,
        listType: data.listType,
        title,
        year,
        // Every DB list is shareable from creation.
        publishedAt: now,
        slug,
      })
      .returning();

    return { list, editSecret };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("lists_owned_goty_year_uidx")) {
      return { error: "You already have a Game of the Year list for that year." };
    }
    if (message.includes("lists_profile_slug_uidx")) {
      return { error: "You already have a list with that name." };
    }
    if (
      message.includes('relation "lists" does not exist') ||
      message.includes("Failed query")
    ) {
      return { error: "Couldn't start this list. Try again." };
    }
    throw err;
  }
}

export async function getOwnedGotyForYear(
  profileId: string,
  year: number,
  db: Db = getDb(),
): Promise<ListRow | null> {
  const [row] = await db
    .select()
    .from(lists)
    .where(
      and(
        eq(lists.profileId, profileId),
        eq(lists.listType, "goty"),
        eq(lists.year, year),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Ranked games from the signed-in profile's GOTY list for `year`, or null if none. */
export async function getOwnedGotyItemsForYear(
  profileId: string,
  year: number,
  opts: { limit?: number; db?: Db } = {},
): Promise<Awaited<ReturnType<typeof loadListItems>> | null> {
  const db = opts.db ?? getDb();
  const list = await getOwnedGotyForYear(profileId, year, db);
  if (!list) return null;
  return loadListItems(list.id, db, { limit: opts.limit });
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

async function loadListItems(
  listId: string,
  db: Db,
  opts: { limit?: number } = {},
) {
  const query = db
    .select({
      id: listItems.id,
      rank: listItems.rank,
      blurb: listItems.blurb,
      gameId: games.id,
      igdbId: games.igdbId,
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

  const rows =
    opts.limit != null ? await query.limit(opts.limit) : await query;

  return rows.map((r) => ({
    id: r.id,
    rank: r.rank,
    blurb: r.blurb,
    gameId: r.gameId,
    igdbId: r.igdbId,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: coverUrlFromImageId(r.coverImageId),
  }));
}

export type HydratedDraftGame = {
  gameId: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export async function hydrateGamesByIgdbIds(
  igdbIds: number[],
  db: Db = getDb(),
): Promise<HydratedDraftGame[]> {
  const unique = [...new Set(igdbIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return [];

  const rows = await db
    .select({
      gameId: games.id,
      igdbId: games.igdbId,
      slug: games.slug,
      title: games.title,
      year: games.year,
      coverImageId: covers.imageId,
    })
    .from(games)
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(inArray(games.igdbId, unique));

  const byIgdb = new Map(rows.map((r) => [r.igdbId, r]));
  return unique
    .map((id) => byIgdb.get(id))
    .filter((r): r is (typeof rows)[number] => Boolean(r))
    .map((r) => ({
      gameId: r.gameId,
      igdbId: r.igdbId,
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
  if (parsed.data.listType != null) {
    patch.listType = parsed.data.listType;
    if (parsed.data.listType === "goty" && parsed.data.year == null && list.year == null) {
      return { error: "GOTY lists need a year." };
    }
    if (parsed.data.listType === "goty" && !parsed.data.title && list.listType !== "goty") {
      const y = parsed.data.year ?? list.year;
      if (y != null) patch.title = defaultGotyTitle(y);
    }
  }
  if (parsed.data.year != null) {
    if ((parsed.data.listType ?? list.listType) === "goty") {
      patch.year = parsed.data.year;
      if (list.profileId) {
        patch.slug = gotySlugForYear(parsed.data.year);
      }
      if ((parsed.data.listType ?? list.listType) === "goty" && !parsed.data.title) {
        patch.title = defaultGotyTitle(parsed.data.year);
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
    if (list.profileId && list.listType === "goty") {
      await syncLiveAggregateForList(list, db);
    }
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
      blurb: item.blurb?.trim() ? item.blurb.trim() : null,
    })),
  );
  await db
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, list.id));

  const items = await loadListItems(list.id, db);
  if (list.profileId && list.listType === "goty") {
    await syncLiveAggregateForList(list, db);
  }
  return { items };
}

async function ensurePublishedAt(
  list: ListRow,
  db: Db,
): Promise<ListRow> {
  if (list.publishedAt) return list;
  const [updated] = await db
    .update(lists)
    .set({
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(lists.id, list.id))
    .returning();
  return updated;
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
    if (updated.listType === "goty" && updated.profileId && updated.year != null) {
      await syncLiveAggregateForList(updated, db);
    }
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
  if (list.profileId != null) {
    return { error: "Only anonymous lists can be reset." };
  }

  await db.delete(lists).where(eq(lists.id, list.id));
  return { ok: true };
}

export type ShareListPayload = {
  list: ListRow;
  items: Awaited<ReturnType<typeof loadListItems>>;
  owner: { username: string; displayName: string } | null;
};

export async function getShareListByPublicId(
  publicId: string,
  db: Db = getDb(),
): Promise<ShareListPayload | null> {
  const list = await getListByPublicId(publicId, db);
  if (!list) return null;

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

export async function getShareListByUsernameSlug(
  username: string,
  slug: string,
  db: Db = getDb(),
): Promise<ShareListPayload | null> {
  const [row] = await db
    .select({
      list: lists,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(lists)
    .innerJoin(profiles, eq(profiles.id, lists.profileId))
    .where(and(eq(profiles.username, username), eq(lists.slug, slug)))
    .limit(1);

  if (!row) return null;

  const items = await loadListItems(row.list.id, db);
  return {
    list: row.list,
    items,
    owner: {
      username: row.username,
      displayName: row.displayName,
    },
  };
}

export async function listOwnedForProfile(
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
    .where(eq(lists.profileId, profileId))
    .orderBy(asc(lists.year), asc(lists.title));
}

export async function getListShareTarget(
  list: Pick<ListRow, "publicId" | "slug" | "profileId">,
  db: Db = getDb(),
): Promise<{ path: string }> {
  if (list.profileId && list.slug) {
    const [profile] = await db
      .select({ username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, list.profileId))
      .limit(1);
    if (profile?.username) {
      return {
        path: listSharePath({
          publicId: list.publicId,
          slug: list.slug,
          username: profile.username,
        }),
      };
    }
  }
  return { path: listSharePath({ publicId: list.publicId }) };
}

type ClientDraftItem = {
  igdbId: number;
  rank: number;
  blurb?: string | null;
};

async function writeItemsFromIgdb(
  list: ListRow,
  rawItems: ClientDraftItem[],
  opts: { allowBlurbs: boolean },
  db: Db,
): Promise<{ error: string } | { ok: true }> {
  const over = assertWithinMaxItems(rawItems.length);
  if (over) return { error: over };

  const normalized = [...rawItems]
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({
      igdbId: item.igdbId,
      rank: index + 1,
      blurb: opts.allowBlurbs ? item.blurb : null,
    }));

  if (normalized.length === 0) {
    await db.delete(listItems).where(eq(listItems.listId, list.id));
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, list.id));
    return { ok: true };
  }

  const igdbIds = normalized.map((i) => i.igdbId);
  const gameRows = await db
    .select({
      id: games.id,
      igdbId: games.igdbId,
      year: games.year,
      firstReleaseDate: games.firstReleaseDate,
      versionParentIgdbId: games.versionParentIgdbId,
      isAdult: games.isAdult,
    })
    .from(games)
    .where(inArray(games.igdbId, igdbIds));

  if (gameRows.length !== igdbIds.length) {
    return { error: "One or more games could not be found." };
  }

  const byIgdb = new Map(gameRows.map((g) => [g.igdbId, g]));

  if (list.listType === "goty") {
    if (list.year == null) {
      return { error: "This GOTY list needs a year." };
    }
    for (const igdbId of igdbIds) {
      const game = byIgdb.get(igdbId);
      if (!game) return { error: "One or more games could not be found." };
      const err = gotyEligibilityError(game, list.year);
      if (err) return { error: err };
    }
  }

  await db.delete(listItems).where(eq(listItems.listId, list.id));
  await db.insert(listItems).values(
    normalized.map((item) => {
      const game = byIgdb.get(item.igdbId)!;
      return {
        listId: list.id,
        gameId: game.id,
        rank: item.rank,
        blurb:
          opts.allowBlurbs && item.blurb?.trim() ? item.blurb.trim() : null,
      };
    }),
  );
  await db
    .update(lists)
    .set({ updatedAt: new Date() })
    .where(eq(lists.id, list.id));

  return { ok: true };
}

async function applyMetaPatch(
  list: ListRow,
  input: {
    title: string;
    listType: "goty" | "custom";
    year: number | null;
  },
  db: Db,
): Promise<{ list: ListRow } | { error: string }> {
  const patch: Partial<ListRow> = {
    title: input.title,
    listType: input.listType,
    year: input.listType === "goty" ? input.year : input.year,
    updatedAt: new Date(),
  };
  if (input.listType === "goty" && input.year == null) {
    return { error: "GOTY lists need a year." };
  }
  if (list.profileId && input.listType === "goty" && input.year != null) {
    patch.slug = gotySlugForYear(input.year);
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

export async function shareListFromClientDraft(
  raw: unknown,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<
  | { list: ListRow; editSecret: string | null }
  | { error: string }
> {
  const publishDenied = shareLinkPublishError(access.profileId);
  if (publishDenied) {
    return { error: publishDenied };
  }

  const parsed = clientDraftUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Check the ranking, title, and year." };
  }
  const data = parsed.data;
  if (data.listType === "goty" && data.year == null) {
    return { error: "GOTY lists need a year." };
  }
  if (data.items.length === 0) {
    return { error: "Add at least one game before sharing." };
  }

  const allowBlurbs = Boolean(access.profileId);
  let list: ListRow | null = null;
  let editSecret: string | null = null;

  if (data.publicId) {
    list = await getListByPublicId(data.publicId, db);
    if (!list) return { error: "List not found." };
    if (
      !canEditList(list, {
        profileId: access.profileId,
        editSecret: access.editSecret,
      })
    ) {
      // Stale publicId from another device — create a fresh shared list.
      list = null;
    }
  }

  if (!list) {
    const created = await createDraft(
      data.listType === "goty"
        ? { listType: "goty", year: data.year!, title: data.title }
        : {
            listType: "custom",
            title: data.title,
            year: data.year ?? undefined,
          },
      { profileId: access.profileId ?? null },
      db,
    );
    if ("error" in created) return created;
    list = created.list;
    editSecret = created.editSecret;
  } else {
    const meta = await applyMetaPatch(
      list,
      {
        title: data.title,
        listType: data.listType,
        year: data.year ?? null,
      },
      db,
    );
    if ("error" in meta) return meta;
    list = meta.list;
  }

  const written = await writeItemsFromIgdb(
    list,
    data.items,
    { allowBlurbs },
    db,
  );
  if ("error" in written) return written;

  list = await ensurePublishedAt(list, db);
  if (list.profileId) {
    await syncLiveAggregateForList(list, db);
  }

  return { list, editSecret };
}

/** Update an existing shared/owned list in place (no create, empty ranking allowed). */
export async function syncExistingSharedListFromClientDraft(
  raw: unknown,
  access: { profileId?: string | null; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ list: ListRow } | { error: string }> {
  const parsed = clientDraftUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Check the ranking, title, and year." };
  }
  const data = parsed.data;
  if (!data.publicId) {
    return { error: "List not found." };
  }
  if (data.listType === "goty" && data.year == null) {
    return { error: "GOTY lists need a year." };
  }

  const list = await getListByPublicId(data.publicId, db);
  if (!list) return { error: "List not found." };
  if (
    !canEditList(list, {
      profileId: access.profileId,
      editSecret: access.editSecret,
    })
  ) {
    return { error: "You cannot edit this list." };
  }

  const meta = await applyMetaPatch(
    list,
    {
      title: data.title,
      listType: data.listType,
      year: data.year ?? null,
    },
    db,
  );
  if ("error" in meta) return meta;

  const written = await writeItemsFromIgdb(
    meta.list,
    data.items,
    { allowBlurbs: Boolean(access.profileId) },
    db,
  );
  if ("error" in written) return written;

  const published = await ensurePublishedAt(meta.list, db);
  if (published.profileId) {
    await syncLiveAggregateForList(published, db);
  }
  return { list: published };
}

export async function saveOwnedListFromClientDraft(
  raw: unknown,
  access: { profileId: string; editSecret?: string | null },
  db: Db = getDb(),
): Promise<{ list: ListRow } | { error: string }> {
  const parsed = clientDraftUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Check the ranking, title, and year." };
  }
  const data = parsed.data;
  if (data.listType === "goty" && data.year == null) {
    return { error: "GOTY lists need a year." };
  }

  let list: ListRow | null = null;

  if (data.publicId) {
    const existing = await getListByPublicId(data.publicId, db);
    if (
      existing &&
      canEditList(existing, {
        profileId: access.profileId,
        editSecret: access.editSecret,
      })
    ) {
      list = existing;
    }
  }

  if (!list && data.listType === "goty" && data.year != null) {
    const [owned] = await db
      .select()
      .from(lists)
      .where(
        and(
          eq(lists.profileId, access.profileId),
          eq(lists.listType, "goty"),
          eq(lists.year, data.year),
        ),
      )
      .limit(1);
    if (owned) list = owned;
  }

  if (!list) {
    const created = await createDraft(
      data.listType === "goty"
        ? { listType: "goty", year: data.year!, title: data.title }
        : {
            listType: "custom",
            title: data.title,
            year: data.year ?? undefined,
          },
      { profileId: access.profileId },
      db,
    );
    if ("error" in created) return created;
    list = created.list;
  } else {
    const meta = await applyMetaPatch(
      list,
      {
        title: data.title,
        listType: data.listType,
        year: data.year ?? null,
      },
      db,
    );
    if ("error" in meta) return meta;
    list = meta.list;
  }

  const written = await writeItemsFromIgdb(
    list,
    data.items,
    { allowBlurbs: true },
    db,
  );
  if ("error" in written) return written;

  if (list.profileId !== access.profileId) {
    const claimed = await claimList(
      list.publicId,
      {
        profileId: access.profileId,
        editSecret: access.editSecret,
      },
      db,
    );
    if ("error" in claimed) return claimed;
    list = claimed.list;
  } else if (!list.slug) {
    const claimed = await claimList(
      list.publicId,
      {
        profileId: access.profileId,
        editSecret: access.editSecret,
      },
      db,
    );
    if (!("error" in claimed)) list = claimed.list;
  }

  list = await ensurePublishedAt(list, db);
  await syncLiveAggregateForList(list, db);

  return { list };
}
