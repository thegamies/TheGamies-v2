/**
 * Idempotently create the QA accounts, communities, memberships, and
 * published editions used by the signed-in staging checks (`pnpm test:staging`).
 *
 * Env: QA_TARGET=staging, QA_STAGING_URL, DATABASE_URL, QA_ACCOUNT_PASSWORD,
 * optional QA_EDITION_YEAR and QA_FIXTURES_OUT (default e2e/.auth/fixtures.json).
 * Refuses production. Never prints passwords or connection strings.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { markNeonAuthEmailVerified } from "@/lib/auth/mark-email-verified";
import {
  removeNeonAuthDirectoryUser,
  type NeonSql,
} from "@/lib/auth/remove-neon-auth-user";
import { listEditionEnabledCategoryIds } from "@/lib/communities/edition-categories";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import {
  publishEditionForSeed,
  seedCommunityEditionBallots,
} from "@/lib/communities/seed-community";
import {
  createCommunity,
  updateCommunityDirectoryFlags,
} from "@/lib/communities/service";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import {
  QA_ACCOUNTS,
  QA_ACCOUNT_KEYS,
  QA_COMMUNITIES,
  QA_SEED_BALLOTS,
  resolveQaTarget,
  type QaAccountKey,
  type QaCommunityKey,
  type QaFixturesFile,
  type QaTarget,
} from "@/lib/qa/staging-fixtures";

function log(message: string) {
  console.log(`qa-fixtures: ${message}`);
}

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? rows : [];
}

async function authPost(target: QaTarget, endpoint: string, body: unknown) {
  return fetch(`${target.appUrl}/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: target.appUrl },
    body: JSON.stringify(body),
  });
}

async function findAuthUserId(query: NeonSql, email: string) {
  const result =
    await query`SELECT id FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`;
  const id = rowsOf(result)[0]?.id;
  return typeof id === "string" ? id : null;
}

async function signUp(target: QaTarget, key: QaAccountKey) {
  const account = QA_ACCOUNTS[key];
  const res = await authPost(target, "sign-up/email", {
    email: account.email,
    password: target.password,
    name: account.displayName,
  });
  if (!res.ok) {
    throw new Error(`sign-up for ${key} failed with HTTP ${res.status}`);
  }
}

async function signInWorks(target: QaTarget, key: QaAccountKey) {
  const res = await authPost(target, "sign-in/email", {
    email: QA_ACCOUNTS[key].email,
    password: target.password,
  });
  return res.ok;
}

/** Auth user exists, is verified, and accepts the current QA password. */
async function ensureAuthUser(
  target: QaTarget,
  query: NeonSql,
  key: QaAccountKey,
): Promise<string> {
  const { email } = QA_ACCOUNTS[key];

  let authUserId = await findAuthUserId(query, email);
  if (!authUserId) {
    await signUp(target, key);
    authUserId = await findAuthUserId(query, email);
    log(`${key}: created auth user`);
  }
  if (!authUserId) throw new Error(`${key}: auth user missing after sign-up`);
  await markNeonAuthEmailVerified({ authUserId, query });

  if (await signInWorks(target, key)) return authUserId;

  // Password secret rotated (or a half-made user): start the auth user over.
  log(`${key}: sign-in failed, recreating auth user`);
  await removeNeonAuthDirectoryUser(authUserId, { query, email });
  await signUp(target, key);
  authUserId = await findAuthUserId(query, email);
  if (!authUserId) throw new Error(`${key}: auth user missing after recreate`);
  await markNeonAuthEmailVerified({ authUserId, query });
  if (!(await signInWorks(target, key))) {
    throw new Error(`${key}: sign-in still failing after recreate`);
  }
  return authUserId;
}

/** Profile row for the auth user; re-points an existing QA profile after a recreate. */
async function ensureProfile(
  db: Db,
  key: QaAccountKey,
  authUserId: string,
): Promise<string> {
  const account = QA_ACCOUNTS[key];
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
  if ("error" in ensured) throw new Error(`${key}: ${ensured.error}`);

  // Keep QA accounts out of people search and public profile pages.
  await db
    .update(profiles)
    .set({ visibility: "private" })
    .where(eq(profiles.id, ensured.profile.id));
  return ensured.profile.id;
}

async function ensureCommunity(
  db: Db,
  key: QaCommunityKey,
  hostProfileId: string,
): Promise<string> {
  const def = QA_COMMUNITIES[key];
  let [row] = await db
    .select({
      id: communities.id,
      createdByProfileId: communities.createdByProfileId,
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
    if ("error" in created) throw new Error(`${key}: ${created.error}`);
    if (created.slug !== def.slug) {
      throw new Error(`${key}: slug ${def.slug} is taken by another community`);
    }
    row = { id: created.id, createdByProfileId: hostProfileId };
    log(`${key}: created community ${def.slug}`);
  }
  if (row.createdByProfileId !== hostProfileId) {
    throw new Error(`${key}: ${def.slug} belongs to a non-QA account`);
  }

  const flags = await updateCommunityDirectoryFlags(def.slug, {
    featured: false,
    joinsClosed: def.joinsClosed,
    visibility: def.visibility,
  });
  if ("error" in flags) throw new Error(`${key}: ${flags.error}`);

  await db
    .insert(communityMembers)
    .values({ communityId: row.id, profileId: hostProfileId, role: "admin" })
    .onConflictDoUpdate({
      target: [communityMembers.communityId, communityMembers.profileId],
      set: { role: "admin" },
    });
  return row.id;
}

async function setMembership(
  db: Db,
  communityId: string,
  profileId: string,
  isMember: boolean,
) {
  if (isMember) {
    await db
      .insert(communityMembers)
      .values({ communityId, profileId, role: "member" })
      .onConflictDoUpdate({
        target: [communityMembers.communityId, communityMembers.profileId],
        set: { role: "member" },
      });
    return;
  }
  await db
    .delete(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.profileId, profileId),
      ),
    );
}

async function ensurePublishedEdition(
  db: Db,
  key: QaCommunityKey,
  communityId: string,
  year: number,
): Promise<string> {
  const slug = QA_COMMUNITIES[key].slug;
  const existing = await getEditionByCommunityYear(communityId, year, db);
  if (existing?.status !== "published") {
    const seeded = await seedCommunityEditionBallots(
      { communitySlug: slug, year, startIndex: 1, count: QA_SEED_BALLOTS },
      db,
    );
    if ("error" in seeded) throw new Error(`${key}: ${seeded.error}`);
    const published = await publishEditionForSeed(slug, year, db);
    if ("error" in published) throw new Error(`${key}: ${published.error}`);
    log(`${key}: seeded and published ${year}`);
  }

  const edition = await getEditionByCommunityYear(communityId, year, db);
  if (edition?.status !== "published") {
    throw new Error(`${key}: ${year} edition is not published`);
  }
  const [categoryId] = await listEditionEnabledCategoryIds(edition.id, db);
  if (!categoryId) throw new Error(`${key}: ${year} edition has no categories`);
  return categoryId;
}

async function main() {
  const target = resolveQaTarget(process.env);
  if ("error" in target) throw new Error(target.error);
  log(`target ${target.appUrl}, year ${target.year}`);

  const query = neon(target.databaseUrl) as unknown as NeonSql;
  const db = createDb(target.databaseUrl);

  const profileIds = {} as Record<QaAccountKey, string>;
  for (const key of QA_ACCOUNT_KEYS) {
    const authUserId = await ensureAuthUser(target, query, key);
    profileIds[key] = await ensureProfile(db, key, authUserId);
  }
  log("accounts ready");

  const out: QaFixturesFile = {
    year: target.year,
    communities: {} as QaFixturesFile["communities"],
  };
  for (const key of Object.keys(QA_COMMUNITIES) as QaCommunityKey[]) {
    const communityId = await ensureCommunity(db, key, profileIds.host);
    await setMembership(db, communityId, profileIds.member, key === "private");
    await setMembership(db, communityId, profileIds.outsider, false);
    const categoryId = await ensurePublishedEdition(
      db,
      key,
      communityId,
      target.year,
    );
    out.communities[key] = { slug: QA_COMMUNITIES[key].slug, categoryId };
  }
  log("communities ready");

  const outFile = path.resolve(
    process.env.QA_FIXTURES_OUT ?? "e2e/.auth/fixtures.json",
  );
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(out, null, 2));
  log(`wrote ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error: unknown) => {
  console.error(
    `qa-fixtures: failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
