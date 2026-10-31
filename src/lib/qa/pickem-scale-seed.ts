import { and, asc, eq, like, or, sql } from "drizzle-orm";
import {
  communities,
  communityEditions,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import type { NeonSql } from "@/lib/auth/neon-sql";
import { removeSelfHostedAuthUser } from "@/lib/auth/remove-self-hosted-auth-user";
import { generateInviteCode } from "@/lib/communities/invite-code";
import { seedEditionBallotsForProfiles } from "@/lib/communities/seed-community";
import { insertInChunks } from "@/lib/db/insert-chunks";
import { ensureProfileForAuthUser } from "@/lib/profile/service";
import {
  ensureVerifiedAuthUser,
  type AuthAppTarget,
} from "@/lib/qa/auth-http";
import {
  loadtestEditionOpenSchedule,
} from "@/lib/qa/loadtest";
import {
  PICKEM_SCALE_BALLOT_LIST_SIZE,
  PICKEM_SCALE_EDITION_HOSTS,
  PICKEM_SCALE_LEGACY_AUTH_PREFIX,
  PICKEM_SCALE_LEGACY_USERNAME_PREFIX,
  PICKEM_SCALE_NOMINEE_RANK,
  PICKEM_SCALE_SLUG_PREFIX,
  PICKEM_SCALE_USERNAME_PREFIX,
  PICKEM_SCALE_USERS_MAX,
  pickemScaleAccount,
  pickemScaleCommunityName,
  pickemScaleCommunitySlug,
} from "@/lib/qa/pickem-scale";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { seedEditionCategories } from "@/lib/communities/edition-categories";
import { recountCommunityPickCounts } from "@/lib/tga-pickem/sheets";
import { getTgaYear, listTgaBallot } from "@/lib/tga-pickem/service";

function getDb(db?: Db): Db {
  return db ?? createDb();
}

const COMMUNITY_CHUNK = 50;

export type SeedPickemScaleInput = {
  year: number;
  communities: number;
  users: number;
  target: AuthAppTarget;
  password: string;
  query: NeonSql;
};

export type SeedPickemScaleResult = {
  year: number;
  users: number;
  communities: number;
  sheets: number;
  editionBallots: number;
  editionHosts: number;
};

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? rows : [];
}

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

async function ensureScaleProfile(
  db: Db,
  index: number,
  authUserId: string,
): Promise<string> {
  const account = pickemScaleAccount(index);
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
      .set({ visibility: "public", updatedAt: new Date() })
      .where(eq(profiles.id, byUsername.id));
    return byUsername.id;
  }

  const ensured = await ensureProfileForAuthUser({
    authUserId,
    username: account.username,
    displayName: account.displayName,
  });
  if ("error" in ensured) {
    throw new Error(`${account.username}: ${ensured.error}`);
  }
  await db
    .update(profiles)
    .set({ visibility: "public", updatedAt: new Date() })
    .where(eq(profiles.id, ensured.profile.id));
  return ensured.profile.id;
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
      description:
        "Synthetic scale fixture for Pick’em and editions. Not a real community.",
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
        await db
          .insert(communities)
          .values(
            chunk.map((row) => ({ ...row, inviteCode: generateInviteCode() })),
          )
          .onConflictDoNothing({ target: communities.slug });
      }
    },
    COMMUNITY_CHUNK,
  );
}

async function repairOpenEdition(
  db: Db,
  input: { communityId: string; year: number; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  const edition = await getEditionByCommunityYear(
    input.communityId,
    input.year,
    db,
  );
  if (!edition) throw new Error(`Open edition ${input.year} is missing`);
  await seedEditionCategories(edition.id, db);
  const schedule = loadtestEditionOpenSchedule(now);
  await db
    .update(communityEditions)
    .set({
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      publishesAt: schedule.publishesAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(communityEditions.id, edition.id),
        eq(communityEditions.communityId, input.communityId),
      ),
    );
  const refreshed = await getEditionByCommunityYear(
    input.communityId,
    input.year,
    db,
  );
  const status = refreshed ? computeEditionStatus(refreshed, now) : "missing";
  if (status !== "open") {
    throw new Error(`Open edition ${input.year}: expected open, got ${status}`);
  }
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

  const profileIds: string[] = [];
  for (let index = 1; index <= userCount; index++) {
    const account = pickemScaleAccount(index);
    const authUserId = await ensureVerifiedAuthUser({
      target: input.target,
      query: input.query,
      email: account.email,
      password: input.password,
      name: account.displayName,
      log: onProgress,
    });
    profileIds.push(await ensureScaleProfile(db, index, authUserId));
  }
  const ownerId = profileIds[0];
  if (!ownerId) throw new Error("Scale profiles were not created.");
  onProgress(`${userCount} Better Auth accounts ready`);

  await ensureCommunities(communityCount, ownerId, db);
  const scaleCommunities = await db
    .select({ id: communities.id, slug: communities.slug })
    .from(communities)
    .where(like(communities.slug, `${PICKEM_SCALE_SLUG_PREFIX}%`));
  const wantedSlugs = new Set(
    Array.from({ length: communityCount }, (_, i) =>
      pickemScaleCommunitySlug(i + 1),
    ),
  );
  const rows = scaleCommunities
    .filter((row) => wantedSlugs.has(row.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  if (rows.length !== communityCount) {
    throw new Error(
      `Expected ${communityCount} scale communities, found ${rows.length}.`,
    );
  }
  onProgress(`${communityCount} communities ready`);

  const profileIdListSql = sql.join(
    profileIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  let editionBallots = 0;
  let editionHosts = 0;
  let done = 0;
  for (const community of rows) {
    await db.execute(sql`
      insert into tga_community_years (community_id, year)
      values (${community.id}::uuid, ${year})
      on conflict do nothing
    `);

    await db
      .insert(communityMembers)
      .values({
        communityId: community.id,
        profileId: ownerId,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: [communityMembers.communityId, communityMembers.profileId],
        set: { role: "admin" },
      });
    const memberIds = profileIds.slice(1);
    if (memberIds.length > 0) {
      await db
        .insert(communityMembers)
        .values(
          memberIds.map((profileId) => ({
            communityId: community.id,
            profileId,
            role: "member" as const,
          })),
        )
        .onConflictDoUpdate({
          target: [communityMembers.communityId, communityMembers.profileId],
          set: { role: "member" },
        });
    }

    await db.execute(sql`
      insert into tga_community_sheets (
        community_id, profile_id, year, world_premieres_guess, ballot_mask, updated_at
      )
      select
        ${community.id}::uuid,
        p.id,
        ${year},
        abs(hashtext(p.id::text)) % 21,
        (
          select decode(
            string_agg(lpad(to_hex(coalesce(n.slot, 0)), 2, '0'), '' order by g.i),
            'hex'
          )
          from generate_series(
            0,
            (select coalesce(max(slot), 0) from tga_categories where year = ${year})
          ) as g(i)
          left join tga_categories c on c.year = ${year} and c.slot = g.i
          left join lateral (
            select cn.slot
            from tga_category_nominees cn
            where cn.category_id = c.id
            order by ${sql.raw(PICKEM_SCALE_NOMINEE_RANK)}
            limit 1
          ) n on c.id is not null
        ),
        now()
      from profiles p
      where p.id in (${profileIdListSql})
        and p.deleted_at is null
      on conflict (community_id, profile_id, year) do update
      set
        ballot_mask = excluded.ballot_mask,
        updated_at = now()
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
          from tga_winners w
          join tga_categories c on c.id = w.category_id and c.year = s.year
          join tga_category_nominees cn
            on cn.category_id = w.category_id
           and cn.nominee_id = w.nominee_id
          where s.ballot_mask is not null
            and get_byte(s.ballot_mask, c.slot) = cn.slot
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
        place = null,
        updated_at = now()
    `);

    const seeded = await seedEditionBallotsForProfiles(
      {
        communityId: community.id,
        year,
        profileIds,
        voiceCount: PICKEM_SCALE_EDITION_HOSTS,
        listSize: PICKEM_SCALE_BALLOT_LIST_SIZE,
        reseed: false,
      },
      db,
    );
    if ("error" in seeded) {
      throw new Error(`${community.slug}: ${seeded.error}`);
    }
    await repairOpenEdition(db, { communityId: community.id, year });
    editionBallots +=
      seeded.createdBallots + seeded.updatedBallots + seeded.skipped;
    editionHosts = Math.max(editionHosts, seeded.voicesSet);

    done += 1;
    if (done % 10 === 0 || done === rows.length) {
      onProgress(`community ${done}/${rows.length}`);
    }
  }

  await recountCommunityPickCounts(year, db);

  return {
    year,
    users: userCount,
    communities: communityCount,
    sheets: communityCount * userCount,
    editionBallots,
    editionHosts,
  };
}

export async function purgePickemScale(
  db: Db = getDb(),
  query?: NeonSql,
): Promise<{
  communities: number;
  profiles: number;
  authUsers: number;
}> {
  const deletedCommunities = await db
    .delete(communities)
    .where(like(communities.slug, `${PICKEM_SCALE_SLUG_PREFIX}%`))
    .returning({ id: communities.id });

  const scaleProfiles = await db
    .select({
      id: profiles.id,
      authUserId: profiles.authUserId,
      username: profiles.username,
    })
    .from(profiles)
    .where(
      or(
        like(profiles.username, `${PICKEM_SCALE_USERNAME_PREFIX}%`),
        like(profiles.username, `${PICKEM_SCALE_LEGACY_USERNAME_PREFIX}%`),
        like(profiles.authUserId, `${PICKEM_SCALE_LEGACY_AUTH_PREFIX}%`),
      ),
    )
    .orderBy(asc(profiles.username));

  let authUsers = 0;
  for (const row of scaleProfiles) {
    await db.delete(profiles).where(eq(profiles.id, row.id));
    if (query) {
      const removed = await removeSelfHostedAuthUser(row.authUserId, { query });
      if (removed) authUsers += 1;
    }
  }

  if (query) {
    for (let index = 1; index <= PICKEM_SCALE_USERS_MAX; index++) {
      const account = pickemScaleAccount(index);
      const result =
        await query`SELECT id FROM auth_user WHERE lower(email) = lower(${account.email}) LIMIT 1`;
      const id = rowsOf(result)[0]?.id;
      if (typeof id === "string") {
        const removed = await removeSelfHostedAuthUser(id, {
          query,
          email: account.email,
        });
        if (removed) authUsers += 1;
      }
    }
  }

  return {
    communities: deletedCommunities.length,
    profiles: scaleProfiles.length,
    authUsers,
  };
}
