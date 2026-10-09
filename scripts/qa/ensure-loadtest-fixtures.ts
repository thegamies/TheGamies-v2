/**
 * Idempotently create load-test accounts, gamies_qa_load, open + published
 * editions, and reserved TGA years. Never touches QA showcase or the promoted
 * TGA year. Refuses production.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { and, eq, isNull, lte } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  games,
  profiles,
  type Db,
} from "@thegamies/db";
import { markNeonAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import {
  removeNeonAuthDirectoryUser,
  type NeonSql,
} from "@/lib/auth/remove-neon-auth-user";
import { listEditionEnabledCategoryIds } from "@/lib/communities/edition-categories";
import { createCommunityEdition, getEditionByCommunityYear } from "@/lib/communities/editions";
import {
  publishEditionForSeed,
  seedCommunityEditionBallots,
} from "@/lib/communities/seed-community";
import { createCommunity } from "@/lib/communities/service";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import { parseWriterCount } from "@/lib/qa/loadtest";
import {
  LOADTEST_COMMUNITY,
  LOADTEST_EDITION_FILLING_YEAR,
  LOADTEST_EDITION_RESULTS_YEAR,
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  loadtestAccount,
  loadtestEditionOpenSchedule,
  type LoadtestFixturesFile,
} from "@/lib/qa/loadtest";
import {
  repairLoadtestOpenEdition,
  repairLoadtestTgaYear,
} from "@/lib/qa/loadtest-repair";
import { resolveQaTarget } from "@/lib/qa/staging-fixtures";

function log(message: string) {
  console.log(`qa-loadtest: ${message}`);
}

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? rows : [];
}

function parseEnsureWriters(argv: string[]): number | { error: string } {
  const idx = argv.indexOf("--writers");
  if (idx === -1) return 0;
  return parseWriterCount(argv[idx + 1]);
}

function cookieHeaderFromResponse(res: Response): string {
  const getSetCookie = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const parts =
    typeof getSetCookie === "function"
      ? getSetCookie.call(res.headers)
      : [res.headers.get("set-cookie") ?? ""];
  return parts
    .flatMap((header) => header.split(/,(?=\s*[^;]+=)/))
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function authPost(appUrl: string, endpoint: string, body: unknown) {
  return fetch(`${appUrl}/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: appUrl },
    body: JSON.stringify(body),
  });
}

async function findAuthUserId(query: NeonSql, email: string) {
  const result =
    await query`SELECT id FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`;
  const id = rowsOf(result)[0]?.id;
  return typeof id === "string" ? id : null;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAuthUser(
  appUrl: string,
  password: string,
  query: NeonSql,
  index: number,
): Promise<{ authUserId: string; cookie: string }> {
  const account = loadtestAccount(index);
  let authUserId = await findAuthUserId(query, account.email);
  if (!authUserId) {
    const res = await authPost(appUrl, "sign-up/email", {
      email: account.email,
      password,
      name: account.displayName,
    });
    if (!res.ok) {
      throw new Error(`sign-up ${account.username} failed HTTP ${res.status}`);
    }
    await sleep(400);
    authUserId = await findAuthUserId(query, account.email);
    log(`${account.username}: created auth user`);
  }
  if (!authUserId) throw new Error(`${account.username}: auth user missing`);
  await markNeonAuthEmailVerified({ authUserId, query });

  let signIn = await authPost(appUrl, "sign-in/email", {
    email: account.email,
    password,
  });
  if (!signIn.ok) {
    log(`${account.username}: sign-in failed, recreating`);
    await removeNeonAuthDirectoryUser(authUserId, {
      query,
      email: account.email,
    });
    const res = await authPost(appUrl, "sign-up/email", {
      email: account.email,
      password,
      name: account.displayName,
    });
    if (!res.ok) {
      throw new Error(`re-sign-up ${account.username} failed HTTP ${res.status}`);
    }
    authUserId = await findAuthUserId(query, account.email);
    if (!authUserId) throw new Error(`${account.username}: missing after recreate`);
    await markNeonAuthEmailVerified({ authUserId, query });
    signIn = await authPost(appUrl, "sign-in/email", {
      email: account.email,
      password,
    });
    if (!signIn.ok) {
      throw new Error(`${account.username}: sign-in still failing`);
    }
  }
  const cookie = cookieHeaderFromResponse(signIn);
  if (!cookie) throw new Error(`${account.username}: no session cookie`);
  return { authUserId, cookie };
}

async function ensureProfile(db: Db, index: number, authUserId: string) {
  const account = loadtestAccount(index);
  const [byUsername] = await db
    .select({ id: profiles.id, authUserId: profiles.authUserId })
    .from(profiles)
    .where(eq(profiles.username, account.username))
    .limit(1);
  if (byUsername && byUsername.authUserId !== authUserId) {
    await db
      .update(profiles)
      .set({ authUserId, updatedAt: new Date() })
      .where(eq(profiles.id, byUsername.id));
  }
  const ensured = await ensureProfileForAuthUser({
    authUserId,
    username: account.username,
    displayName: account.displayName,
  });
  if ("error" in ensured) throw new Error(`${account.username}: ${ensured.error}`);
  await db
    .update(profiles)
    .set({ visibility: "private" })
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
    .insert(communityMembers)
    .values({ communityId: row.id, profileId: hostProfileId, role: "admin" })
    .onConflictDoUpdate({
      target: [communityMembers.communityId, communityMembers.profileId],
      set: { role: "admin" },
    });
  return row.id;
}

async function pickCatalogGames(db: Db, year: number) {
  const now = new Date();
  return db
    .select({
      id: games.id,
      slug: games.slug,
      igdbId: games.igdbId,
    })
    .from(games)
    .where(
      and(
        eq(games.year, year),
        isNull(games.igdbRemovedAt),
        eq(games.isAdult, false),
        isNull(games.versionParentIgdbId),
        lte(games.firstReleaseDate, now),
      ),
    )
    .limit(8);
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  const writers = parseEnsureWriters(process.argv.slice(2));
  if (typeof writers !== "number") throw new Error(writers.error);
  const accountCount = Math.max(1, writers);
  log(`target ${target.appUrl}, writers ${writers} (accounts ${accountCount})`);

  const query = neon(target.databaseUrl) as unknown as NeonSql;
  const db = createDb(target.databaseUrl);

  const cookies: Array<{ index: number; cookie: string }> = [];
  const profileIds: string[] = [];
  for (let index = 1; index <= accountCount; index++) {
    const { authUserId, cookie } = await ensureAuthUser(
      target.appUrl,
      target.password,
      query,
      index,
    );
    const profileId = await ensureProfile(db, index, authUserId);
    profileIds.push(profileId);
    if (index <= writers || writers === 0) {
      cookies.push({ index, cookie });
    }
    if (index > 1) {
      await sleep(250);
    }
  }
  if (writers === 0) cookies.length = 0;
  log("accounts ready");

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

  const catalog = await pickCatalogGames(db, LOADTEST_EDITION_FILLING_YEAR);
  const game = catalog[0];
  if (!game) {
    throw new Error(
      `Need released ${LOADTEST_EDITION_FILLING_YEAR} catalog games for load-test ballots.`,
    );
  }
  const ballotItems = catalog.slice(0, 3).map((row, i) => ({
    gameId: row.id,
    rank: i + 1,
  }));

  const filling = await getEditionByCommunityYear(
    communityId,
    LOADTEST_EDITION_FILLING_YEAR,
    db,
  );
  if (!filling) {
    const schedule = loadtestEditionOpenSchedule(new Date());
    const created = await createCommunityEdition(
      LOADTEST_COMMUNITY.slug,
      hostProfileId,
      {
        year: LOADTEST_EDITION_FILLING_YEAR,
        opensAt: schedule.opensAt.toISOString(),
        closesAt: schedule.closesAt.toISOString(),
        publishesAt: schedule.publishesAt.toISOString(),
      },
      db,
    );
    if ("error" in created) throw new Error(created.error);
  }
  await repairLoadtestOpenEdition(db, {
    communityId,
    year: LOADTEST_EDITION_FILLING_YEAR,
  });

  const results = await getEditionByCommunityYear(
    communityId,
    LOADTEST_EDITION_RESULTS_YEAR,
    db,
  );
  if (results?.status !== "published") {
    const seeded = await seedCommunityEditionBallots(
      {
        communitySlug: LOADTEST_COMMUNITY.slug,
        year: LOADTEST_EDITION_RESULTS_YEAR,
        startIndex: 1,
        count: 8,
      },
      db,
    );
    if ("error" in seeded) throw new Error(seeded.error);
    const published = await publishEditionForSeed(
      LOADTEST_COMMUNITY.slug,
      LOADTEST_EDITION_RESULTS_YEAR,
      db,
    );
    if ("error" in published) throw new Error(published.error);
    log(`published ${LOADTEST_EDITION_RESULTS_YEAR}`);
  }
  const published = await getEditionByCommunityYear(
    communityId,
    LOADTEST_EDITION_RESULTS_YEAR,
    db,
  );
  if (published?.status !== "published") {
    throw new Error(`${LOADTEST_EDITION_RESULTS_YEAR} is not published`);
  }
  const [categoryId] = await listEditionEnabledCategoryIds(published.id, db);
  if (!categoryId) throw new Error("Published edition has no categories");

  const tgaOpenPicks = await repairLoadtestTgaYear(db, {
    year: LOADTEST_TGA_OPEN_YEAR,
    phase: "open",
    communityId,
    gameId: game.id,
  });
  const tgaLockedPicks = await repairLoadtestTgaYear(db, {
    year: LOADTEST_TGA_LOCKED_YEAR,
    phase: "locked",
    communityId,
    gameId: game.id,
  });
  log("TGA load years ready");

  const outDir = path.resolve("e2e/.auth/loadtest");
  await mkdir(outDir, { recursive: true });
  const fixtures: LoadtestFixturesFile = {
    communitySlug: LOADTEST_COMMUNITY.slug,
    communityId,
    fillingYear: LOADTEST_EDITION_FILLING_YEAR,
    resultsYear: LOADTEST_EDITION_RESULTS_YEAR,
    resultsCategoryId: categoryId,
    tgaOpenYear: LOADTEST_TGA_OPEN_YEAR,
    tgaLockedYear: LOADTEST_TGA_LOCKED_YEAR,
    tgaOpenPicks,
    tgaLockedPicks,
    game: { id: game.id, slug: game.slug, igdbId: game.igdbId },
    ballotItems,
    writerCount: writers,
  };
  await writeFile(
    path.join(outDir, "fixtures.json"),
    JSON.stringify(fixtures, null, 2),
  );
  await writeFile(
    path.join(outDir, "cookies.json"),
    JSON.stringify({ writers: cookies }, null, 2),
  );
  log(`wrote ${path.relative(process.cwd(), outDir)}`);
}

main().catch((error: unknown) => {
  console.error(
    `qa-loadtest: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
