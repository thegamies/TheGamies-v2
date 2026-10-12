import { asc, like, sql } from "drizzle-orm";
import {
  communities,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { generateInviteCode } from "@/lib/communities/invite-code";
import { insertInChunks } from "@/lib/db/insert-chunks";
import { seedProfileCreateFields } from "@/lib/seed-accounts";
import { getTgaYear, listTgaBallot } from "@/lib/tga-pickem/service";
import {
  PICKEM_SCALE_AUTH_PREFIX,
  PICKEM_SCALE_SLUG_PREFIX,
  pickemScaleAuthBounds,
  pickemScaleAuthUserId,
  pickemScaleCommunityName,
  pickemScaleCommunitySlug,
  pickemScaleDisplayName,
  pickemScaleUsername,
} from "@/lib/qa/pickem-scale";

function getDb(db?: Db): Db {
  return db ?? createDb();
}

const PROFILE_CHUNK = 100;
const COMMUNITY_CHUNK = 50;

export type SeedPickemScaleInput = {
  year: number;
  communities: number;
  users: number;
};

export type SeedPickemScaleResult = {
  year: number;
  users: number;
  communities: number;
  sheets: number;
};

async function ensureYearSlate(
  year: number,
  db: Db,
): Promise<{ officialWp: number | null }> {
  const current = await getTgaYear(year, db);
  if (!current) {
    throw new Error(`TGA ${year} is missing.`);
  }
  const ballot = await listTgaBallot(year, db);
  if (
    ballot.length === 0 ||
    ballot.every((category) => category.nominees.length === 0)
  ) {
    throw new Error(`TGA ${year} has no nominees.`);
  }
  return { officialWp: current.worldPremieresOfficial ?? null };
}

async function ensureProfiles(users: number, db: Db): Promise<void> {
  const wanted = Array.from({ length: users }, (_, i) => {
    const index = i + 1;
    return {
      authUserId: pickemScaleAuthUserId(index),
      username: pickemScaleUsername(index),
      displayName: pickemScaleDisplayName(index),
      bio: "Synthetic Pick’em scale member.",
      visibility: "public" as const,
      ...seedProfileCreateFields(),
    };
  });
  await insertInChunks(
    wanted,
    (chunk) =>
      db
        .insert(profiles)
        .values(chunk)
        .onConflictDoNothing({ target: profiles.authUserId }),
    PROFILE_CHUNK,
  );
}

async function ensureCommunities(
  count: number,
  createdByProfileId: string,
  db: Db,
): Promise<void> {
  const wanted = Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    return {
      slug: pickemScaleCommunitySlug(index),
      name: pickemScaleCommunityName(index),
      description: "Synthetic Pick’em scale fixture. Not a real community.",
      visibility: "public" as const,
      joinsClosed: true,
      createdByProfileId,
      inviteCode: generateInviteCode(),
    };
  });
  await insertInChunks(
    wanted,
    async (chunk) => {
      try {
        await db.insert(communities).values(chunk).onConflictDoNothing({
          target: communities.slug,
        });
      } catch {
        await db.insert(communities).values(
          chunk.map((row) => ({ ...row, inviteCode: generateInviteCode() })),
        ).onConflictDoNothing({ target: communities.slug });
      }
    },
    COMMUNITY_CHUNK,
  );
}

export async function seedPickemScale(
  input: SeedPickemScaleInput,
  db: Db = getDb(),
  onProgress: (message: string) => void = () => {},
): Promise<SeedPickemScaleResult> {
  const year = input.year;
  const userCount = input.users;
  const communityCount = input.communities;
  const { officialWp } = await ensureYearSlate(year, db);
  onProgress(`TGA ${year} slate ready`);

  await ensureProfiles(userCount, db);
  const [owner] = await db
    .select({ id: profiles.id, authUserId: profiles.authUserId })
    .from(profiles)
    .where(like(profiles.authUserId, `${PICKEM_SCALE_AUTH_PREFIX}%`))
    .orderBy(asc(profiles.authUserId))
    .limit(1);
  if (!owner) throw new Error("Scale profiles were not created.");
  onProgress(`${userCount} seed profiles ready`);

  await ensureCommunities(communityCount, owner.id, db);
  const scaleCommunities = await db
    .select({ id: communities.id, slug: communities.slug })
    .from(communities)
    .where(like(communities.slug, `${PICKEM_SCALE_SLUG_PREFIX}%`));
  const wantedSlugs = new Set(
    Array.from({ length: communityCount }, (_, i) =>
      pickemScaleCommunitySlug(i + 1),
    ),
  );
  const rows = scaleCommunities.filter((row) => wantedSlugs.has(row.slug));
  if (rows.length !== communityCount) {
    throw new Error(
      `Expected ${communityCount} scale communities, found ${rows.length}.`,
    );
  }
  onProgress(`${communityCount} communities ready`);

  const bounds = pickemScaleAuthBounds(userCount);
  const firstAuth = pickemScaleAuthUserId(1);

  let done = 0;
  for (const community of rows) {
    await db.execute(sql`
      insert into tga_community_years (community_id, year)
      values (${community.id}::uuid, ${year})
      on conflict do nothing
    `);
    await db.execute(sql`
      insert into community_members (community_id, profile_id, role, joined_at)
      select
        ${community.id}::uuid,
        p.id,
        case when p.auth_user_id = ${firstAuth} then 'admin' else 'member' end,
        now()
      from profiles p
      where p.is_seed = true
        and p.deleted_at is null
        and p.auth_user_id >= ${bounds.first}
        and p.auth_user_id <= ${bounds.last}
      on conflict do nothing
    `);
    await db.execute(sql`
      insert into tga_community_sheets (
        community_id, profile_id, year, world_premieres_guess, updated_at
      )
      select
        ${community.id}::uuid,
        p.id,
        ${year},
        abs(hashtext(p.id::text)) % 21,
        now()
      from profiles p
      where p.is_seed = true
        and p.deleted_at is null
        and p.auth_user_id >= ${bounds.first}
        and p.auth_user_id <= ${bounds.last}
      on conflict do nothing
    `);
    await db.execute(sql`
      insert into tga_community_picks (
        community_id, profile_id, year, category_id, nominee_id
      )
      select
        ${community.id}::uuid,
        p.id,
        ${year},
        cat.id,
        n.nominee_id
      from profiles p
      join tga_categories cat on cat.year = ${year}
      join lateral (
        select cn.nominee_id
        from tga_category_nominees cn
        where cn.category_id = cat.id
        order by md5(p.id::text || cat.id::text)
        limit 1
      ) n on true
      where p.is_seed = true
        and p.deleted_at is null
        and p.auth_user_id >= ${bounds.first}
        and p.auth_user_id <= ${bounds.last}
      on conflict do nothing
    `);
    await db.execute(sql`
      insert into tga_community_scores (
        community_id, year, profile_id, points, wp_delta, updated_at
      )
      select
        ${community.id}::uuid,
        ${year},
        s.profile_id,
        coalesce((
          select count(*)::int
          from tga_community_picks pk
          join tga_winners w
            on w.category_id = pk.category_id
           and w.nominee_id = pk.nominee_id
          where pk.community_id = ${community.id}::uuid
            and pk.profile_id = s.profile_id
            and pk.year = ${year}
        ), 0),
        case
          when ${officialWp}::int is null or s.world_premieres_guess is null then null
          else abs(s.world_premieres_guess - ${officialWp}::int)
        end,
        now()
      from tga_community_sheets s
      where s.community_id = ${community.id}::uuid
        and s.year = ${year}
      on conflict (community_id, year, profile_id) do update
      set
        points = excluded.points,
        wp_delta = excluded.wp_delta,
        updated_at = now()
    `);
    done += 1;
    if (done % 25 === 0 || done === rows.length) {
      onProgress(`community ${done}/${rows.length}`);
    }
  }

  return {
    year,
    users: userCount,
    communities: communityCount,
    sheets: communityCount * userCount,
  };
}

export async function purgePickemScale(db: Db = getDb()): Promise<{
  communities: number;
  profiles: number;
}> {
  const deletedCommunities = await db
    .delete(communities)
    .where(like(communities.slug, `${PICKEM_SCALE_SLUG_PREFIX}%`))
    .returning({ id: communities.id });
  const deletedProfiles = await db
    .delete(profiles)
    .where(like(profiles.authUserId, `${PICKEM_SCALE_AUTH_PREFIX}%`))
    .returning({ id: profiles.id });
  return {
    communities: deletedCommunities.length,
    profiles: deletedProfiles.length,
  };
}
