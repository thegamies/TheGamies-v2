import { and, asc, eq, inArray } from "drizzle-orm";
import {
  communityEditionVoices,
  communityMembers,
  createDb,
  profiles,
  type Db,
} from "@thegamies/db";
import { computeEditionStatus } from "./edition-status";
import { getEditionByCommunityYear } from "./editions";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";

function getDb(): Db {
  return createDb();
}

export type EditionVoicePublic = {
  profileId: string;
  username: string;
  displayName: string;
  designatedAt: Date;
};

export function editionVoicesWriteBlockedReason(
  status: ReturnType<typeof computeEditionStatus>,
): string | null {
  if (status === "published") {
    return "Voices are locked after results are published.";
  }
  return null;
}

export async function listEditionVoices(
  editionId: string,
  db: Db = getDb(),
): Promise<EditionVoicePublic[]> {
  const rows = await db
    .select({
      profileId: communityEditionVoices.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
      designatedAt: communityEditionVoices.designatedAt,
    })
    .from(communityEditionVoices)
    .innerJoin(profiles, eq(profiles.id, communityEditionVoices.profileId))
    .where(eq(communityEditionVoices.editionId, editionId))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  return rows;
}

export async function listEditionVoiceProfileIds(
  editionId: string,
  db: Db = getDb(),
): Promise<Set<string>> {
  const rows = await db
    .select({ profileId: communityEditionVoices.profileId })
    .from(communityEditionVoices)
    .where(eq(communityEditionVoices.editionId, editionId));
  return new Set(rows.map((r) => r.profileId));
}

export async function setEditionVoice(
  slug: string,
  year: number,
  actorProfileId: string,
  targetProfileId: string,
  isVoice: boolean,
  db: Db = getDb(),
): Promise<{ ok: true } | { error: string }> {
  const detail = await getCommunityBySlug(slug, actorProfileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can designate Voices." };
  }

  const edition = await getEditionByCommunityYear(detail.id, year, db);
  if (!edition) return { error: "Edition not found." };

  const blocked = editionVoicesWriteBlockedReason(edition.status);
  if (blocked) return { error: blocked };

  const [member] = await db
    .select({ profileId: communityMembers.profileId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, detail.id),
        eq(communityMembers.profileId, targetProfileId),
      ),
    )
    .limit(1);
  if (!member) {
    return { error: "Only community members can be Voices." };
  }

  if (isVoice) {
    await db
      .insert(communityEditionVoices)
      .values({
        editionId: edition.id,
        profileId: targetProfileId,
        designatedAt: new Date(),
        designatedByProfileId: actorProfileId,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(communityEditionVoices)
      .where(
        and(
          eq(communityEditionVoices.editionId, edition.id),
          eq(communityEditionVoices.profileId, targetProfileId),
        ),
      );
  }

  return { ok: true };
}

export async function listMembersWithEditionVoiceFlags(
  communityId: string,
  editionId: string,
  db: Db = getDb(),
): Promise<
  Array<{
    profileId: string;
    username: string;
    displayName: string;
    isVoice: boolean;
  }>
> {
  const members = await db
    .select({
      profileId: communityMembers.profileId,
      username: profiles.username,
      displayName: profiles.displayName,
    })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.id, communityMembers.profileId))
    .where(eq(communityMembers.communityId, communityId))
    .orderBy(asc(profiles.displayName), asc(profiles.username));

  if (members.length === 0) return [];

  const voiceIds = await listEditionVoiceProfileIds(editionId, db);
  return members.map((m) => ({
    ...m,
    isVoice: voiceIds.has(m.profileId),
  }));
}

/** Used by freeze to resolve voice set without joining twice. */
export async function listEditionVoicesForProfiles(
  editionId: string,
  profileIds: string[],
  db: Db = getDb(),
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();
  const rows = await db
    .select({ profileId: communityEditionVoices.profileId })
    .from(communityEditionVoices)
    .where(
      and(
        eq(communityEditionVoices.editionId, editionId),
        inArray(communityEditionVoices.profileId, profileIds),
      ),
    );
  return new Set(rows.map((r) => r.profileId));
}
