import { randomBytes, randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import {
  activityEvents,
  communities,
  communityEditions,
  communityMembers,
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

    async game(overrides: Partial<GameInsert> = {}) {
      const n = next();
      const [row] = await db
        .insert(games)
        .values({
          igdbId: igdbBase + n,
          slug: `int-${tag}-g${n}`,
          title: `Int Game ${tag} ${n}`,
          ...overrides,
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

    /** Communities first: edition ballots and hosts restrict profile deletes. */
    async cleanup() {
      if (created.communities.length > 0) {
        await db.delete(communities).where(inArray(communities.id, created.communities));
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
    },
  };
}

export type Seeder = ReturnType<typeof createSeeder>;
