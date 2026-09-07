import { and, desc, eq, sql } from "drizzle-orm";
import {
  covers,
  createDb,
  games,
  libraryEntries,
  type Db,
} from "@thegamies/db";
import { coverUrlFromImageId } from "@thegamies/igdb";
import {
  paginateProfileItems,
} from "@/lib/profile/profile-page";
import {
  libraryEventKindForStatus,
  parseLibraryStatus,
  parseLibraryVisibility,
  type LibraryStatus,
  type LibraryVisibility,
} from "@/lib/activity/kinds";
import { insertActivityEvents } from "@/lib/activity/emit";

export const PROFILE_LIBRARY_PAGE_SIZE = 24;

function getDb(): Db {
  return createDb();
}

export type LibraryEntry = {
  gameId: string;
  status: LibraryStatus;
  visibility: LibraryVisibility;
  updatedAt: Date;
};

export type LibraryShelfItem = LibraryEntry & {
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export async function getLibraryEntry(
  profileId: string,
  gameId: string,
  db: Db = getDb(),
): Promise<LibraryEntry | null> {
  const [row] = await db
    .select({
      gameId: libraryEntries.gameId,
      status: libraryEntries.status,
      visibility: libraryEntries.visibility,
      updatedAt: libraryEntries.updatedAt,
    })
    .from(libraryEntries)
    .where(
      and(
        eq(libraryEntries.profileId, profileId),
        eq(libraryEntries.gameId, gameId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const status = parseLibraryStatus(row.status);
  if (!status) return null;
  return {
    gameId: row.gameId,
    status,
    visibility: parseLibraryVisibility(row.visibility),
    updatedAt: row.updatedAt,
  };
}

export async function setLibraryStatus(
  profileId: string,
  gameId: string,
  input: { status: LibraryStatus; visibility?: LibraryVisibility },
  db: Db = getDb(),
): Promise<LibraryEntry> {
  const visibility = input.visibility ?? "public";
  const now = new Date();
  await db
    .insert(libraryEntries)
    .values({
      profileId,
      gameId,
      status: input.status,
      visibility,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [libraryEntries.profileId, libraryEntries.gameId],
      set: {
        status: input.status,
        visibility,
        updatedAt: now,
      },
    });
  await insertActivityEvents(
    [
      {
        profileId,
        kind: libraryEventKindForStatus(input.status),
        batchId: crypto.randomUUID(),
        gameId,
      },
    ],
    db,
  );
  return {
    gameId,
    status: input.status,
    visibility,
    updatedAt: now,
  };
}

export async function clearLibraryEntry(
  profileId: string,
  gameId: string,
  db: Db = getDb(),
): Promise<void> {
  const existing = await getLibraryEntry(profileId, gameId, db);
  if (!existing) return;
  await db
    .delete(libraryEntries)
    .where(
      and(
        eq(libraryEntries.profileId, profileId),
        eq(libraryEntries.gameId, gameId),
      ),
    );
  await insertActivityEvents(
    [
      {
        profileId,
        kind: "library_cleared",
        batchId: crypto.randomUUID(),
        gameId,
      },
    ],
    db,
  );
}

export async function listLibraryForProfilePage(
  profileId: string,
  pageRaw: number,
  opts: { publicOnly: boolean },
  db: Db = getDb(),
): Promise<{
  items: LibraryShelfItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const pageSize = PROFILE_LIBRARY_PAGE_SIZE;
  const visibilityFilter = opts.publicOnly
    ? and(
        eq(libraryEntries.profileId, profileId),
        eq(libraryEntries.visibility, "public"),
      )
    : eq(libraryEntries.profileId, profileId);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(libraryEntries)
    .where(visibilityFilter);
  const total = Number(countRow?.n ?? 0);
  const { page, offset, totalPages } = paginateProfileItems(
    pageRaw,
    total,
    pageSize,
  );

  const rows = await db
    .select({
      gameId: libraryEntries.gameId,
      status: libraryEntries.status,
      visibility: libraryEntries.visibility,
      updatedAt: libraryEntries.updatedAt,
      slug: games.slug,
      title: games.title,
      year: games.year,
      coverImageId: covers.imageId,
    })
    .from(libraryEntries)
    .innerJoin(games, eq(games.id, libraryEntries.gameId))
    .leftJoin(covers, eq(covers.igdbId, games.coverIgdbId))
    .where(visibilityFilter)
    .orderBy(desc(libraryEntries.updatedAt), games.title)
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.flatMap((row) => {
      const status = parseLibraryStatus(row.status);
      if (!status) return [];
      return [
        {
          gameId: row.gameId,
          status,
          visibility: parseLibraryVisibility(row.visibility),
          updatedAt: row.updatedAt,
          slug: row.slug,
          title: row.title,
          year: row.year,
          coverUrl: coverUrlFromImageId(row.coverImageId),
        },
      ];
    }),
    page,
    pageSize,
    total,
    totalPages,
  };
}
