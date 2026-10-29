/**
 * Idempotently create load-test Better Auth users (verified via SQL — no mail),
 * profiles, gamies_qa_load, one public custom share list per account, one open
 * 2025 edition with seeded ballots, and opt the load community into TGA 2025.
 * Does not change the 2025 show schedule (the load runner does that). Never
 * touches QA showcase. Refuses production.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { and, asc, desc, eq, isNull, lte, notInArray } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import type { NeonSql } from "@/lib/auth/neon-sql";
import { listEditionEnabledCategoryIds } from "@/lib/communities/edition-categories";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { seedCommunityEditionBallots } from "@/lib/communities/seed-community";
import { createCommunity } from "@/lib/communities/service";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import { ensureVerifiedAuthUser } from "@/lib/qa/auth-http";
import {
  LOADTEST_BALLOT_POPULAR_POOL,
  LOADTEST_BALLOT_UNPOPULAR_POOL,
  LOADTEST_COMMUNITY,
  LOADTEST_EDITION_HOSTS,
  LOADTEST_EDITION_SEED_BALLOTS,
  LOADTEST_EDITION_YEAR,
  LOADTEST_POPULAR_POOL,
  LOADTEST_TGA_YEAR,
  LOADTEST_UNPOPULAR_POOL,
  loadtestAccount,
  loadtestEditionSeedBatches,
  mergeLoadtestGameBands,
  parseWriterCount,
  type LoadtestFixturesFile,
  type LoadtestShareList,
} from "@/lib/qa/loadtest";
import { ensureLoadtestShareList } from "@/lib/qa/loadtest-share-lists";
import {
  attachLoadtestTgaCommunity,
  repairLoadtestOpenEdition,
} from "@/lib/qa/loadtest-repair";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";

function log(message: string) {
  console.log(`qa-loadtest: ${message}`);
}

function parseEnsureWriters(argv: string[]): number | { error: string } {
  const idx = argv.indexOf("--writers");
  if (idx === -1) return 0;
  return parseWriterCount(argv[idx + 1]);
}

async function ensureProfile(
  db: Db,
  index: number,
  authUserId: string,
): Promise<string> {
  const account = loadtestAccount(index);
  const [byUsername] = await db
    .select({ id: profiles.id, authUserId: profiles.authUserId })
    .from(profiles)
    .where(eq(profiles.username, account.username))
    .limit(1);

  if (byUsername && byUsername.authUserId !== authUserId) {
    await db
      .update(profiles)
      .set({
        authUserId,
        visibility: "public",
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, byUsername.id));
    return byUsername.id;
  }
  if (byUsername) {
    await db
      .update(profiles)
      .set({ visibility: "public" })
      .where(eq(profiles.id, byUsername.id));
    return byUsername.id;
  }

  const ensured = await ensureProfileForAuthUser({
    authUserId,
    username: account.username,
    displayName: account.displayName,
  });
  if ("error" in ensured) throw new Error(`${account.username}: ${ensured.error}`);
  await db
    .update(profiles)
    .set({ visibility: "public" })
    .where(eq(profiles.id, ensured.profile.id));
  return ensured.profile.id;
}

async function ensureCommunity(db: Db, hostProfileId: string): Promise<string> {
  const def = LOADTEST_COMMUNITY;
  let [row] = await db
    .select({
      id: communities.id,
      createdByProfileId: communities.createdByProfileId,
      slug: communities.slug,
    })
    .from(communities)
    .where(eq(communities.slug, def.slug))
    .limit(1);
  if (!row) {
    const created = await createCommunity(hostProfileId, {
      name: def.name,
      description: def.description,
      visibility: def.visibility,
    });
    if ("error" in created) throw new Error(created.error);
    if (created.slug !== def.slug) {
      throw new Error(`slug ${def.slug} is taken`);
    }
    row = {
      id: created.id,
      createdByProfileId: hostProfileId,
      slug: created.slug,
    };
    log(`created community ${def.slug}`);
  }
  await db
    .update(communities)
    .set({
      visibility: def.visibility,
      joinsClosed: def.joinsClosed,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, row.id));
  await db
    .insert(communityMembers)
    .values({ communityId: row.id, profileId: hostProfileId, role: "admin" })
    .onConflictDoUpdate({
      target: [communityMembers.communityId, communityMembers.profileId],
      set: { role: "admin" },
    });
  return row.id;
}

async function pickCatalogBand(
  db: Db,
  input: {
    year?: number;
    limit: number;
    band: "popular" | "unpopular";
    excludeIds?: string[];
  },
) {
  const now = new Date();
  const filters = [
    isNull(games.igdbRemovedAt),
    eq(games.isAdult, false),
    isNull(games.versionParentIgdbId),
    lte(games.firstReleaseDate, now),
  ];
  if (input.year != null) filters.push(eq(games.year, input.year));
  if (input.excludeIds && input.excludeIds.length > 0) {
    filters.push(notInArray(games.id, input.excludeIds));
  }
  return db
    .select({
      id: games.id,
      slug: games.slug,
      igdbId: games.igdbId,
      title: games.title,
    })
    .from(games)
    .where(and(...filters))
    .orderBy(
      input.band === "popular"
        ? desc(games.popularity)
        : asc(games.popularity),
      games.id,
    )
    .limit(input.limit);
}

async function pickCatalogPool(
  db: Db,
  input: { year?: number; popular: number; unpopular: number },
) {
  const popular = await pickCatalogBand(db, {
    year: input.year,
    limit: input.popular,
    band: "popular",
  });
  const unpopular = await pickCatalogBand(db, {
    year: input.year,
    limit: input.unpopular,
    band: "unpopular",
    excludeIds: popular.map((row) => row.id),
  });
  return mergeLoadtestGameBands(popular, unpopular);
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  const writers = parseEnsureWriters(process.argv.slice(2));
  if (typeof writers !== "number") throw new Error(writers.error);
  const accountCount = Math.max(1, writers);
  log(`target ${target.appUrl}, writers ${writers} (accounts ${accountCount})`);

  const db = createDb(target.databaseUrl);
  const query = neon(target.databaseUrl) as unknown as NeonSql;

  const profileIds: string[] = [];
  for (let index = 1; index <= accountCount; index++) {
    const account = loadtestAccount(index);
    const authUserId = await ensureVerifiedAuthUser({
      target,
      query,
      email: account.email,
      password: target.password,
      name: account.displayName,
      log,
    });
    profileIds.push(await ensureProfile(db, index, authUserId));
  }
  log("accounts ready (Better Auth + verified)");

  const hostProfileId = profileIds[0]!;
  const communityId = await ensureCommunity(db, hostProfileId);
  for (const profileId of profileIds.slice(1)) {
    await db
      .insert(communityMembers)
      .values({ communityId, profileId, role: "member" })
      .onConflictDoUpdate({
        target: [communityMembers.communityId, communityMembers.profileId],
        set: { role: "member" },
      });
  }

  const catalogGames = await pickCatalogPool(db, {
    popular: LOADTEST_POPULAR_POOL,
    unpopular: LOADTEST_UNPOPULAR_POOL,
  });
  const ballotGames = await pickCatalogPool(db, {
    year: LOADTEST_EDITION_YEAR,
    popular: LOADTEST_BALLOT_POPULAR_POOL,
    unpopular: LOADTEST_BALLOT_UNPOPULAR_POOL,
  });
  const game = ballotGames[0] ?? catalogGames[0];
  if (!game || ballotGames.length === 0) {
    throw new Error(
      `Need released catalog games for load-test lists and ${LOADTEST_EDITION_YEAR} ballots.`,
    );
  }
  const ballotItems = ballotGames.slice(0, 3).map((row, i) => ({
    gameId: row.id,
    rank: i + 1,
  }));
  const shareGameIds = (catalogGames.length > 0 ? catalogGames : ballotGames).map(
    (row) => row.id,
  );
  const lists: LoadtestShareList[] = [];
  for (let i = 0; i < profileIds.length; i++) {
    lists.push(
      await ensureLoadtestShareList(db, {
        profileId: profileIds[i]!,
        username: loadtestAccount(i + 1).username,
        gameIds: shareGameIds,
      }),
    );
  }
  log(`share lists ${lists.length}`);

  let ballots = 0;
  let hosts = 0;
  for (const batch of loadtestEditionSeedBatches()) {
    const seeded = await seedCommunityEditionBallots(
      {
        communitySlug: LOADTEST_COMMUNITY.slug,
        year: LOADTEST_EDITION_YEAR,
        startIndex: batch.startIndex,
        count: batch.count,
        voiceCount: batch.startIndex === 1 ? LOADTEST_EDITION_HOSTS : 0,
        reseed: false,
      },
      db,
    );
    if ("error" in seeded) throw new Error(seeded.error);
    ballots += seeded.createdBallots + seeded.updatedBallots + seeded.skipped;
    hosts += seeded.voicesSet;
    log(
      `edition ${LOADTEST_EDITION_YEAR} ballots ${batch.startIndex}–${batch.startIndex + batch.count - 1}`,
    );
  }
  if (ballots !== LOADTEST_EDITION_SEED_BALLOTS) {
    throw new Error(
      `Expected ${LOADTEST_EDITION_SEED_BALLOTS} seed ballots, counted ${ballots}.`,
    );
  }
  if (hosts !== LOADTEST_EDITION_HOSTS) {
    throw new Error(`Expected ${LOADTEST_EDITION_HOSTS} hosts, set ${hosts}.`);
  }
  await repairLoadtestOpenEdition(db, {
    communityId,
    year: LOADTEST_EDITION_YEAR,
  });
  const open = await getEditionByCommunityYear(
    communityId,
    LOADTEST_EDITION_YEAR,
    db,
  );
  if (open?.status !== "open") {
    throw new Error(`${LOADTEST_EDITION_YEAR} is not open`);
  }
  const [categoryId] = await listEditionEnabledCategoryIds(open.id, db);
  if (!categoryId) throw new Error("Open edition has no categories");
  log(
    `open ${LOADTEST_EDITION_YEAR}: ${ballots} ballots, ${hosts} hosts`,
  );

  const tga = await attachLoadtestTgaCommunity(db, {
    year: LOADTEST_TGA_YEAR,
    communityId,
  });
  log("TGA 2025 slate attached");

  const outDir = path.resolve("e2e/.auth/loadtest");
  await mkdir(outDir, { recursive: true });
  const fixtures: LoadtestFixturesFile = {
    communitySlug: LOADTEST_COMMUNITY.slug,
    communityId,
    fillingYear: LOADTEST_EDITION_YEAR,
    resultsYear: LOADTEST_EDITION_YEAR,
    resultsCategoryId: categoryId,
    tgaYear: LOADTEST_TGA_YEAR,
    tgaSlate: tga.slate,
    tgaPicks: tga.picks,
    game: { id: game.id, slug: game.slug, igdbId: game.igdbId },
    games: catalogGames.length > 0 ? catalogGames : ballotGames,
    ballotGames,
    ballotItems,
    writerCount: writers,
    lists,
  };
  await writeFile(
    path.join(outDir, "fixtures.json"),
    JSON.stringify(fixtures, null, 2),
  );
  await rm(path.join(outDir, "cookies.json"), { force: true });
  log(`wrote ${path.relative(process.cwd(), outDir)}`);
}

main().catch((error: unknown) => {
  console.error(
    `qa-loadtest: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
