import { and, eq, inArray } from "drizzle-orm";
import {
  communities,
  communityEditionBallots,
  communityEditionResultVoters,
  communityEditionVoices,
  communityEditions,
  communityMembers,
  createDb,
  lists,
  profiles,
  type Db,
} from "@thegamies/db";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import { clearOwnedGotyContrib } from "@/lib/live-aggregate/contrib";
import { scheduleYearRefresh } from "@/lib/live-aggregate/refresh";
import {
  anonymizedVoterUsername,
  FORMER_MEMBER_DISPLAY_NAME,
  lastHostAccountDeleteMessage,
  shouldKeepEditionBallot,
  tombstoneProfileFields,
} from "./delete-account";

function getDb(): Db {
  return createDb();
}

export async function listLastHostCommunityNames(
  profileId: string,
  db: Db = getDb(),
): Promise<string[]> {
  const memberships = await db
    .select({
      communityId: communityMembers.communityId,
      role: communityMembers.role,
      name: communities.name,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.profileId, profileId));

  const adminMemberships = memberships.filter((row) => row.role === "admin");
  if (adminMemberships.length === 0) return [];

  const communityIds = adminMemberships.map((row) => row.communityId);
  const hostRows = await db
    .select({
      communityId: communityMembers.communityId,
    })
    .from(communityMembers)
    .where(
      and(
        inArray(communityMembers.communityId, communityIds),
        eq(communityMembers.role, "admin"),
      ),
    );

  const hostCount = new Map<string, number>();
  for (const row of hostRows) {
    hostCount.set(row.communityId, (hostCount.get(row.communityId) ?? 0) + 1);
  }

  return adminMemberships
    .filter((row) => (hostCount.get(row.communityId) ?? 0) <= 1)
    .map((row) => row.name)
    .sort((a, b) => a.localeCompare(b));
}

async function deleteOwnedListsForProfile(profileId: string, db: Db): Promise<void> {
  const owned = await db
    .select({
      id: lists.id,
      listType: lists.listType,
    })
    .from(lists)
    .where(eq(lists.profileId, profileId));

  const years = new Set<number>();
  for (const list of owned) {
    if (list.listType === "goty") {
      const cleared = await clearOwnedGotyContrib(list.id, db);
      for (const year of cleared.years) years.add(year);
    }
  }
  if (owned.length > 0) {
    await db.delete(lists).where(eq(lists.profileId, profileId));
  }
  scheduleYearRefresh([...years]);
}

async function dropUnpublishedEditionRows(profileId: string, db: Db): Promise<void> {
  const ballotEditions = await db
    .select({
      id: communityEditions.id,
      opensAt: communityEditions.opensAt,
      closesAt: communityEditions.closesAt,
      publishesAt: communityEditions.publishesAt,
    })
    .from(communityEditionBallots)
    .innerJoin(
      communityEditions,
      eq(communityEditions.id, communityEditionBallots.editionId),
    )
    .where(eq(communityEditionBallots.profileId, profileId));

  const voiceEditions = await db
    .select({
      id: communityEditions.id,
      opensAt: communityEditions.opensAt,
      closesAt: communityEditions.closesAt,
      publishesAt: communityEditions.publishesAt,
    })
    .from(communityEditionVoices)
    .innerJoin(
      communityEditions,
      eq(communityEditions.id, communityEditionVoices.editionId),
    )
    .where(eq(communityEditionVoices.profileId, profileId));

  const byId = new Map<string, (typeof ballotEditions)[number]>();
  for (const edition of [...ballotEditions, ...voiceEditions]) {
    byId.set(edition.id, edition);
  }

  const dropIds: string[] = [];
  for (const edition of byId.values()) {
    if (!shouldKeepEditionBallot(computeEditionStatus(edition))) {
      dropIds.push(edition.id);
    }
  }
  if (dropIds.length === 0) return;

  await db
    .delete(communityEditionBallots)
    .where(
      and(
        eq(communityEditionBallots.profileId, profileId),
        inArray(communityEditionBallots.editionId, dropIds),
      ),
    );
  await db
    .delete(communityEditionVoices)
    .where(
      and(
        eq(communityEditionVoices.profileId, profileId),
        inArray(communityEditionVoices.editionId, dropIds),
      ),
    );
}

export async function purgeAndTombstoneProfile(
  profileId: string,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ error: string } | { ok: true }> {
  const lastHostNames = await listLastHostCommunityNames(profileId, db);
  const blocked = lastHostAccountDeleteMessage(lastHostNames);
  if (blocked) return { error: blocked };

  await deleteOwnedListsForProfile(profileId, db);
  const { retireCommunityHostEverywhere } = await import(
    "@/lib/communities/community-hosts"
  );
  await retireCommunityHostEverywhere(profileId, db);
  await dropUnpublishedEditionRows(profileId, db);

  // Comparison reads Host columns from freeze voters + live ballot ranks
  // (joined on profile_id). Keep those rows; only rename the public identity.
  await db
    .update(communityEditionResultVoters)
    .set({
      displayName: FORMER_MEMBER_DISPLAY_NAME,
      username: anonymizedVoterUsername(profileId),
    })
    .where(eq(communityEditionResultVoters.profileId, profileId));

  await db
    .delete(communityMembers)
    .where(eq(communityMembers.profileId, profileId));

  const fields = tombstoneProfileFields(profileId, now);
  // Keep the profile row. Ceremony ballots / Host columns restrict-delete
  // against profiles; a hard delete would strip Results Comparison.
  const [updated] = await db
    .update(profiles)
    .set(fields)
    .where(eq(profiles.id, profileId))
    .returning({ id: profiles.id });
  if (!updated) return { error: "Profile not found." };
  return { ok: true };
}
