import { randomBytes, randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import {
  activityEvents,
  awardCategories,
  communities,
  communityCustomCategories,
  communityCustomCategoryEntries,
  communityEditionBallotCategoryVotes,
  communityEditionBallotCustomCategoryVotes,
  communityEditionBallotItems,
  communityEditionBallots,
  communityEditionCategories,
  communityEditions,
  communityEditionVoices,
  communityMembers,
  covers,
  games,
  libraryEntries,
  listItems,
  lists,
  profileFollows,
  profiles,
  type Db,
} from "@thegamies/db";
import type {
  ActivityKind,
  LibraryStatus,
  LibraryVisibility,
} from "@/lib/activity/kinds";

type ProfileInsert = typeof profiles.$inferInsert;
type GameInsert = typeof games.$inferInsert;
type ListInsert = typeof lists.$inferInsert;
type CommunityInsert = typeof communities.$inferInsert;
type EditionInsert = typeof communityEditions.$inferInsert;
type CustomCategoryInsert = typeof communityCustomCategories.$inferInsert;
type CustomEntryInsert = typeof communityCustomCategoryEntries.$inferInsert;

/**
 * Seeds rows under a random tag so files can run in parallel against a shared
 * test database (CI branch or your personal branch). Call `cleanup()` in
 * `afterAll`; it deletes only rows this seeder created.
 */
export function createSeeder(db: Db) {
  const tag = randomBytes(5).toString("hex");
  const igdbBase = 2_000_000_000 + (randomBytes(3).readUIntBE(0, 3) % 100_000) * 1_000;
  let counter = 0;
  const next = () => ++counter;

  const created = {
    profiles: [] as string[],
    games: [] as string[],
    lists: [] as string[],
    communities: [] as string[],
    awardCategories: [] as string[],
    covers: [] as number[],
  };

  return {
    tag,

    async profile(overrides: Partial<ProfileInsert> = {}) {
      const n = next();
      const [row] = await db
        .insert(profiles)
        .values({
          authUserId: `int-${tag}-${n}`,
          username: `int${tag}${n}`,
          displayName: `Int ${tag} ${n}`,
          ...overrides,
        })
        .returning();
      created.profiles.push(row.id);
      return row;
    },

    /** `coverImageId` adds a covers row linked through `games.cover_igdb_id`. */
    async game(overrides: Partial<GameInsert> & { coverImageId?: string } = {}) {
      const n = next();
      const { coverImageId, ...gameOverrides } = overrides;
      if (coverImageId) {
        await db.insert(covers).values({ igdbId: igdbBase + n, imageId: coverImageId });
        created.covers.push(igdbBase + n);
      }
      const [row] = await db
        .insert(games)
        .values({
          igdbId: igdbBase + n,
          slug: `int-${tag}-g${n}`,
          title: `Int Game ${tag} ${n}`,
          ...(coverImageId ? { coverIgdbId: igdbBase + n } : {}),
          ...gameOverrides,
        })
        .returning();
      created.games.push(row.id);
      return row;
    },

    async follow(followerProfileId: string, followedProfileId: string, createdAt?: Date) {
      await db
        .insert(profileFollows)
        .values({ followerProfileId, followedProfileId, ...(createdAt ? { createdAt } : {}) });
    },

    async libraryEntry(input: {
      profileId: string;
      gameId: string;
      status: LibraryStatus;
      visibility?: LibraryVisibility;
    }) {
      await db.insert(libraryEntries).values({
        profileId: input.profileId,
        gameId: input.gameId,
        status: input.status,
        visibility: input.visibility ?? "public",
      });
    },

    async activity(input: {
      profileId: string;
      kind: ActivityKind;
      gameId?: string | null;
      listId?: string | null;
      createdAt?: Date;
    }) {
      await db.insert(activityEvents).values({
        profileId: input.profileId,
        kind: input.kind,
        gameId: input.gameId ?? null,
        listId: input.listId ?? null,
        batchId: randomUUID(),
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      });
    },

    async list(
      input: Partial<ListInsert> & { gameIds?: string[] } = {},
    ) {
      const n = next();
      const { gameIds = [], ...overrides } = input;
      const [row] = await db
        .insert(lists)
        .values({
          publicId: `int-${tag}-l${n}`,
          listType: "custom",
          title: `Int List ${tag} ${n}`,
          ...overrides,
        })
        .returning();
      created.lists.push(row.id);
      if (gameIds.length > 0) {
        await db.insert(listItems).values(
          gameIds.map((gameId, i) => ({ listId: row.id, gameId, rank: i + 1 })),
        );
      }
      return row;
    },

    async community(overrides: Partial<CommunityInsert> = {}) {
      const n = next();
      const [row] = await db
        .insert(communities)
        .values({
          slug: `int-${tag}-c${n}`,
          name: `Int Community ${tag} ${n}`,
          inviteCode: `int-${tag}-i${n}`,
          ...overrides,
        })
        .returning();
      created.communities.push(row.id);
      return row;
    },

    async member(communityId: string, profileId: string, role: "admin" | "member" = "member") {
      await db.insert(communityMembers).values({ communityId, profileId, role });
    },

    async edition(communityId: string, year: number, overrides: Partial<EditionInsert> = {}) {
      const [row] = await db
        .insert(communityEditions)
        .values({ communityId, year, ...overrides })
        .returning();
      return row;
    },

    /** Edition ballot; `gameIds[i]` gets rank `i + 1` unless `ranks` is given. */
    async ballot(input: {
      editionId: string;
      profileId: string;
      gameIds?: string[];
      ranks?: number[];
    }) {
      const [row] = await db
        .insert(communityEditionBallots)
        .values({ editionId: input.editionId, profileId: input.profileId })
        .returning();
      const gameIds = input.gameIds ?? [];
      if (gameIds.length > 0) {
        await db.insert(communityEditionBallotItems).values(
          gameIds.map((gameId, i) => ({
            ballotId: row.id,
            gameId,
            rank: input.ranks?.[i] ?? i + 1,
          })),
        );
      }
      return row;
    },

    async voice(editionId: string, profileId: string) {
      await db.insert(communityEditionVoices).values({ editionId, profileId });
    },

    async awardCategory(label: string) {
      const id = `int-${tag}-cat${next()}`;
      await db.insert(awardCategories).values({ id, label, description: `${label} blurb`, active: false });
      created.awardCategories.push(id);
      return id;
    },

    async enableCategory(editionId: string, categoryId: string, sortOrder: number) {
      await db.insert(communityEditionCategories).values({ editionId, categoryId, sortOrder });
    },

    async categoryVote(ballotId: string, categoryId: string, gameId: string) {
      await db.insert(communityEditionBallotCategoryVotes).values({ ballotId, categoryId, gameId });
    },

    async customCategory(
      editionId: string,
      overrides: Partial<CustomCategoryInsert> = {},
    ) {
      const n = next();
      const [row] = await db
        .insert(communityCustomCategories)
        .values({
          editionId,
          name: `Int Award ${tag} ${n}`,
          description: `Int award ${n} blurb`,
          answerType: "any_game",
          ...overrides,
        })
        .returning();
      return row;
    },

    async customEntry(categoryId: string, overrides: Partial<CustomEntryInsert> = {}) {
      const n = next();
      const [row] = await db
        .insert(communityCustomCategoryEntries)
        .values({ categoryId, title: `Int Entry ${tag} ${n}`, ...overrides })
        .returning();
      return row;
    },

    async customVote(input: {
      ballotId: string;
      categoryId: string;
      gameId?: string;
      entryId?: string;
    }) {
      await db.insert(communityEditionBallotCustomCategoryVotes).values({
        ballotId: input.ballotId,
        categoryId: input.categoryId,
        gameId: input.gameId ?? null,
        entryId: input.entryId ?? null,
      });
    },

    /** Communities first: edition ballots and hosts restrict profile deletes. */
    async cleanup() {
      if (created.communities.length > 0) {
        await db.delete(communities).where(inArray(communities.id, created.communities));
      }
      if (created.awardCategories.length > 0) {
        await db
          .delete(awardCategories)
          .where(inArray(awardCategories.id, created.awardCategories));
      }
      if (created.lists.length > 0) {
        await db.delete(lists).where(inArray(lists.id, created.lists));
      }
      if (created.profiles.length > 0) {
        await db.delete(lists).where(inArray(lists.profileId, created.profiles));
        await db.delete(profiles).where(inArray(profiles.id, created.profiles));
      }
      if (created.games.length > 0) {
        await db.delete(games).where(inArray(games.id, created.games));
      }
      if (created.covers.length > 0) {
        await db.delete(covers).where(inArray(covers.igdbId, created.covers));
      }
    },
  };
}

export type Seeder = ReturnType<typeof createSeeder>;
