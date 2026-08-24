import { and, asc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import {
  communities,
  communityMembers,
  createDb,
  profiles,
  tgaCommunityPicks,
  tgaCommunityScores,
  tgaCommunitySheets,
  tgaCommunityYears,
  tgaSitePicks,
  tgaSiteScores,
  tgaSiteSheets,
  tgaYears,
  type Db,
} from "@thegamies/db";
import { insertInChunks } from "@/lib/db/insert-chunks";
import { SEED_COMMUNITY_AUTH_PREFIX } from "@/lib/communities/seed-community";
import { SEED_AUTH_PREFIX } from "@/lib/live-aggregate/seed-standings";
import { listTgaBallot } from "./service";

export const SEED_TGA_MAX_BATCH = 50;
export const SEED_TGA_INSERT_CHUNK = 200;

export function tgaCommunitySeedSlugError(slug: string): string | null {
  return slug.trim() ? null : "Enter a community slug.";
}

function getDb(db?: Db): Db {
  return db ?? createDb();
}

export function pickSeedNomineeId(
  nomineeIds: string[],
  random = Math.random,
): string | null {
  if (nomineeIds.length === 0) return null;
  return nomineeIds[Math.floor(random() * nomineeIds.length)] ?? null;
}

export function seedWorldPremieresGuess(
  random = Math.random,
  center = 14,
): number {
  const jitter = Math.floor(random() * 11) - 5;
  return Math.max(0, Math.min(200, Math.floor(center) + jitter));
}

export function buildSeedTgaPicks(
  categories: Array<{ id: string; nomineeIds: string[] }>,
  random = Math.random,
): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const category of categories) {
    const nomineeId = pickSeedNomineeId(category.nomineeIds, random);
    if (nomineeId) picks[category.id] = nomineeId;
  }
  return picks;
}

const seedProfileFilter = or(
  like(profiles.authUserId, `${SEED_AUTH_PREFIX}%`),
  like(profiles.authUserId, `${SEED_COMMUNITY_AUTH_PREFIX}%`),
);

export async function countTgaSheetSeeds(
  year: number,
  db: Db = getDb(),
): Promise<{
  siteSheets: number;
  seedVoterSheets: number;
  seedVotersWithoutSheet: number;
}> {
  const [site] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tgaSiteSheets)
    .where(eq(tgaSiteSheets.year, year));
  const [seedSheets] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tgaSiteSheets)
    .innerJoin(profiles, eq(profiles.id, tgaSiteSheets.profileId))
    .where(and(eq(tgaSiteSheets.year, year), seedProfileFilter));
  const [missing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .leftJoin(
      tgaSiteSheets,
      and(eq(tgaSiteSheets.profileId, profiles.id), eq(tgaSiteSheets.year, year)),
    )
    .where(
      and(
        isNull(profiles.deletedAt),
        seedProfileFilter,
        isNull(tgaSiteSheets.profileId),
      ),
    );
  return {
    siteSheets: Number(site?.n ?? 0),
    seedVoterSheets: Number(seedSheets?.n ?? 0),
    seedVotersWithoutSheet: Number(missing?.n ?? 0),
  };
}

async function communityBySlug(
  slug: string,
  db: Db,
): Promise<{ id: string; slug: string } | { error: string }> {
  const slugError = tgaCommunitySeedSlugError(slug);
  if (slugError) return { error: slugError };
  const trimmed = slug.trim().toLowerCase();
  const [row] = await db
    .select({ id: communities.id, slug: communities.slug })
    .from(communities)
    .where(eq(communities.slug, trimmed))
    .limit(1);
  if (!row) return { error: "Community not found." };
  return row;
}

export async function countTgaCommunitySheetSeeds(
  communitySlug: string,
  year: number,
  db: Db = getDb(),
): Promise<
  | {
      communityId: string;
      slug: string;
      communitySheets: number;
      seedMemberSheets: number;
      seedMembersWithoutSheet: number;
      optedIn: boolean;
    }
  | { error: string }
> {
  const community = await communityBySlug(communitySlug, db);
  if ("error" in community) return community;

  const [opted] = await db
    .select({ year: tgaCommunityYears.year })
    .from(tgaCommunityYears)
    .where(
      and(
        eq(tgaCommunityYears.communityId, community.id),
        eq(tgaCommunityYears.year, year),
      ),
    )
    .limit(1);

  const [allSheets] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tgaCommunitySheets)
    .where(
      and(
        eq(tgaCommunitySheets.communityId, community.id),
        eq(tgaCommunitySheets.year, year),
      ),
    );
  const [seedSheets] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tgaCommunitySheets)
    .innerJoin(profiles, eq(profiles.id, tgaCommunitySheets.profileId))
    .where(
      and(
        eq(tgaCommunitySheets.communityId, community.id),
        eq(tgaCommunitySheets.year, year),
        seedProfileFilter,
      ),
    );
  const [missing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .leftJoin(
      tgaCommunitySheets,
      and(
        eq(tgaCommunitySheets.communityId, community.id),
        eq(tgaCommunitySheets.profileId, communityMembers.profileId),
        eq(tgaCommunitySheets.year, year),
      ),
    )
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        isNull(profiles.deletedAt),
        seedProfileFilter,
        isNull(tgaCommunitySheets.profileId),
      ),
    );

  return {
    communityId: community.id,
    slug: community.slug,
    communitySheets: Number(allSheets?.n ?? 0),
    seedMemberSheets: Number(seedSheets?.n ?? 0),
    seedMembersWithoutSheet: Number(missing?.n ?? 0),
    optedIn: Boolean(opted),
  };
}

export type SeedTgaSheetsInput = {
  year: number;
  afterProfileId?: string | null;
  count?: number;
};

export type SeedTgaSheetsResult = {
  year: number;
  wrote: number;
  lastProfileId: string | null;
};

async function rescoreSiteSheets(
  year: number,
  profileIds: string[],
  officialWp: number | null,
  db: Db,
) {
  if (profileIds.length === 0) return;
  await db.execute(sql`
    insert into tga_site_scores (year, profile_id, points, wp_delta, updated_at)
    select
      ${year},
      s.profile_id,
      coalesce((
        select count(*)::int
        from tga_site_picks p
        join tga_winners w
          on w.category_id = p.category_id
         and w.nominee_id = p.nominee_id
        where p.profile_id = s.profile_id
          and p.year = ${year}
      ), 0),
      case
        when ${officialWp}::int is null or s.world_premieres_guess is null then null
        else abs(s.world_premieres_guess - ${officialWp}::int)
      end,
      now()
    from tga_site_sheets s
    where s.year = ${year}
      and s.profile_id in (${sql.join(profileIds.map((id) => sql`${id}::uuid`), sql`, `)})
    on conflict (year, profile_id) do update
    set
      points = excluded.points,
      wp_delta = excluded.wp_delta,
      updated_at = now()
  `);
}

export async function seedTgaSheets(
  input: SeedTgaSheetsInput,
  db: Db = getDb(),
): Promise<SeedTgaSheetsResult | { error: string }> {
  const year = Math.floor(input.year);
  const [slate] = await db
    .select()
    .from(tgaYears)
    .where(eq(tgaYears.year, year));
  if (!slate) return { error: "Year not found." };

  const ballot = await listTgaBallot(year, db);
  const categories = ballot
    .map((category) => ({
      id: category.id,
      nomineeIds: category.nominees.map((nominee) => nominee.id),
    }))
    .filter((category) => category.nomineeIds.length > 0);
  if (categories.length === 0) {
    return { error: "Load nominees for this year first." };
  }

  const count = Math.min(
    SEED_TGA_MAX_BATCH,
    Math.max(1, Math.floor(input.count ?? SEED_TGA_MAX_BATCH)),
  );
  const after = input.afterProfileId;
  const targets = await db
    .select({ id: profiles.id, username: profiles.username })
    .from(profiles)
    .leftJoin(
      tgaSiteSheets,
      and(
        eq(tgaSiteSheets.profileId, profiles.id),
        eq(tgaSiteSheets.year, year),
      ),
    )
    .where(
      and(
        isNull(profiles.deletedAt),
        seedProfileFilter,
        isNull(tgaSiteSheets.profileId),
        after ? gt(profiles.id, after) : undefined,
      ),
    )
    .orderBy(asc(profiles.id))
    .limit(count);

  const now = new Date();
  const pickRows: Array<{
    profileId: string;
    year: number;
    categoryId: string;
    nomineeId: string;
  }> = [];

  for (const profile of targets) {
    const picks = buildSeedTgaPicks(categories);
    const guess = seedWorldPremieresGuess();
    await db.insert(tgaSiteSheets).values({
      profileId: profile.id,
      year,
      worldPremieresGuess: guess,
      updatedAt: now,
    });
    for (const [categoryId, nomineeId] of Object.entries(picks)) {
      pickRows.push({ profileId: profile.id, year, categoryId, nomineeId });
    }
  }

  const targetIds = targets.map((row) => row.id);
  if (targetIds.length > 0) {
    await insertInChunks(
      pickRows,
      (chunk) => db.insert(tgaSitePicks).values(chunk),
      SEED_TGA_INSERT_CHUNK,
    );
    await rescoreSiteSheets(year, targetIds, slate.worldPremieresOfficial, db);
  }

  return {
    year,
    wrote: targets.length,
    lastProfileId: targets.at(-1)?.id ?? null,
  };
}

async function rescoreCommunitySheets(
  communityId: string,
  year: number,
  profileIds: string[],
  officialWp: number | null,
  db: Db,
) {
  if (profileIds.length === 0) return;
  await db.execute(sql`
    insert into tga_community_scores (community_id, year, profile_id, points, wp_delta, updated_at)
    select
      ${communityId}::uuid,
      ${year},
      s.profile_id,
      coalesce((
        select count(*)::int
        from tga_community_picks p
        join tga_winners w
          on w.category_id = p.category_id
         and w.nominee_id = p.nominee_id
        where p.community_id = ${communityId}::uuid
          and p.profile_id = s.profile_id
          and p.year = ${year}
      ), 0),
      case
        when ${officialWp}::int is null or s.world_premieres_guess is null then null
        else abs(s.world_premieres_guess - ${officialWp}::int)
      end,
      now()
    from tga_community_sheets s
    where s.community_id = ${communityId}::uuid
      and s.year = ${year}
      and s.profile_id in (${sql.join(profileIds.map((id) => sql`${id}::uuid`), sql`, `)})
    on conflict (community_id, year, profile_id) do update
    set
      points = excluded.points,
      wp_delta = excluded.wp_delta,
      updated_at = now()
  `);
}

export type SeedTgaCommunitySheetsInput = {
  communitySlug: string;
  year: number;
  afterProfileId?: string | null;
  count?: number;
};

export async function seedTgaCommunitySheets(
  input: SeedTgaCommunitySheetsInput,
  db: Db = getDb(),
): Promise<SeedTgaSheetsResult | { error: string }> {
  const year = Math.floor(input.year);
  const community = await communityBySlug(input.communitySlug, db);
  if ("error" in community) return community;

  const [opted] = await db
    .select({ year: tgaCommunityYears.year })
    .from(tgaCommunityYears)
    .where(
      and(
        eq(tgaCommunityYears.communityId, community.id),
        eq(tgaCommunityYears.year, year),
      ),
    )
    .limit(1);
  if (!opted) {
    return { error: "Turn on pick’em for this community first." };
  }

  const [slate] = await db
    .select()
    .from(tgaYears)
    .where(eq(tgaYears.year, year));
  if (!slate) return { error: "Year not found." };

  const ballot = await listTgaBallot(year, db);
  const categories = ballot
    .map((category) => ({
      id: category.id,
      nomineeIds: category.nominees.map((nominee) => nominee.id),
    }))
    .filter((category) => category.nomineeIds.length > 0);
  if (categories.length === 0) {
    return { error: "Load nominees for this year first." };
  }

  const count = Math.min(
    SEED_TGA_MAX_BATCH,
    Math.max(1, Math.floor(input.count ?? SEED_TGA_MAX_BATCH)),
  );
  const after = input.afterProfileId;
  const targets = await db
    .select({ id: profiles.id })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .leftJoin(
      tgaCommunitySheets,
      and(
        eq(tgaCommunitySheets.communityId, community.id),
        eq(tgaCommunitySheets.profileId, communityMembers.profileId),
        eq(tgaCommunitySheets.year, year),
      ),
    )
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        isNull(profiles.deletedAt),
        seedProfileFilter,
        isNull(tgaCommunitySheets.profileId),
        after ? gt(profiles.id, after) : undefined,
      ),
    )
    .orderBy(asc(profiles.id))
    .limit(count);

  const now = new Date();
  const pickRows: Array<{
    communityId: string;
    profileId: string;
    year: number;
    categoryId: string;
    nomineeId: string;
  }> = [];

  for (const profile of targets) {
    const picks = buildSeedTgaPicks(categories);
    const guess = seedWorldPremieresGuess();
    await db.insert(tgaCommunitySheets).values({
      communityId: community.id,
      profileId: profile.id,
      year,
      worldPremieresGuess: guess,
      updatedAt: now,
    });
    for (const [categoryId, nomineeId] of Object.entries(picks)) {
      pickRows.push({
        communityId: community.id,
        profileId: profile.id,
        year,
        categoryId,
        nomineeId,
      });
    }
  }

  const targetIds = targets.map((row) => row.id);
  if (targetIds.length > 0) {
    await insertInChunks(
      pickRows,
      (chunk) => db.insert(tgaCommunityPicks).values(chunk),
      SEED_TGA_INSERT_CHUNK,
    );
    await rescoreCommunitySheets(
      community.id,
      year,
      targetIds,
      slate.worldPremieresOfficial,
      db,
    );
  }

  return {
    year,
    wrote: targets.length,
    lastProfileId: targets.at(-1)?.id ?? null,
  };
}

export async function clearTgaSheetsForSeedVoters(
  year: number,
  db: Db = getDb(),
): Promise<{ deletedSheets: number }> {
  const rows = await db
    .select({ profileId: profiles.id })
    .from(profiles)
    .where(and(isNull(profiles.deletedAt), seedProfileFilter));
  const ids = rows.map((row) => row.profileId);
  if (ids.length === 0) return { deletedSheets: 0 };

  await db
    .delete(tgaSitePicks)
    .where(and(eq(tgaSitePicks.year, year), inArray(tgaSitePicks.profileId, ids)));
  await db
    .delete(tgaCommunityPicks)
    .where(
      and(
        eq(tgaCommunityPicks.year, year),
        inArray(tgaCommunityPicks.profileId, ids),
      ),
    );
  await db
    .delete(tgaSiteScores)
    .where(and(eq(tgaSiteScores.year, year), inArray(tgaSiteScores.profileId, ids)));
  await db
    .delete(tgaCommunityScores)
    .where(
      and(
        eq(tgaCommunityScores.year, year),
        inArray(tgaCommunityScores.profileId, ids),
      ),
    );
  const deleted = await db
    .delete(tgaSiteSheets)
    .where(and(eq(tgaSiteSheets.year, year), inArray(tgaSiteSheets.profileId, ids)))
    .returning({ profileId: tgaSiteSheets.profileId });
  await db
    .delete(tgaCommunitySheets)
    .where(
      and(
        eq(tgaCommunitySheets.year, year),
        inArray(tgaCommunitySheets.profileId, ids),
      ),
    );
  return { deletedSheets: deleted.length };
}

export async function clearTgaCommunitySheetsForSeedVoters(
  communitySlug: string,
  year: number,
  db: Db = getDb(),
): Promise<{ deletedSheets: number } | { error: string }> {
  const community = await communityBySlug(communitySlug, db);
  if ("error" in community) return community;

  const rows = await db
    .select({ profileId: profiles.id })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(
      and(
        eq(communityMembers.communityId, community.id),
        isNull(profiles.deletedAt),
        seedProfileFilter,
      ),
    );
  const ids = rows.map((row) => row.profileId);
  if (ids.length === 0) return { deletedSheets: 0 };

  await db
    .delete(tgaCommunityPicks)
    .where(
      and(
        eq(tgaCommunityPicks.communityId, community.id),
        eq(tgaCommunityPicks.year, year),
        inArray(tgaCommunityPicks.profileId, ids),
      ),
    );
  await db
    .delete(tgaCommunityScores)
    .where(
      and(
        eq(tgaCommunityScores.communityId, community.id),
        eq(tgaCommunityScores.year, year),
        inArray(tgaCommunityScores.profileId, ids),
      ),
    );
  const deleted = await db
    .delete(tgaCommunitySheets)
    .where(
      and(
        eq(tgaCommunitySheets.communityId, community.id),
        eq(tgaCommunitySheets.year, year),
        inArray(tgaCommunitySheets.profileId, ids),
      ),
    )
    .returning({ profileId: tgaCommunitySheets.profileId });
  return { deletedSheets: deleted.length };
}
