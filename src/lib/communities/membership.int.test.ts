import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  communityBans,
  communityEditionVoices,
  communityMembers,
} from "@thegamies/db";
import { promoteCommunityHost } from "@/lib/communities/community-hosts";
import { COMMUNITY_HOSTS_MAX } from "@/lib/communities/host-limits";
import { banCommunityMember } from "@/lib/communities/moderation";
import { joinCommunityPublic } from "@/lib/communities/service";
import { integrationDb } from "@/test/integration/db";
import { createSeeder, type Seeder } from "@/test/integration/seed";

const db = integrationDb();

async function isMember(communityId: string, profileId: string) {
  const rows = await db
    .select()
    .from(communityMembers)
    .where(
      and(eq(communityMembers.communityId, communityId), eq(communityMembers.profileId, profileId)),
    );
  return rows.length > 0;
}

async function isBanned(communityId: string, profileId: string) {
  const rows = await db
    .select()
    .from(communityBans)
    .where(and(eq(communityBans.communityId, communityId), eq(communityBans.profileId, profileId)));
  return rows.length > 0;
}

async function voiceEditionIds(profileId: string, editionIds: string[]) {
  const rows = await db
    .select({ editionId: communityEditionVoices.editionId })
    .from(communityEditionVoices)
    .where(eq(communityEditionVoices.profileId, profileId));
  return rows.map((row) => row.editionId).filter((id) => editionIds.includes(id));
}

describe("community membership (integration)", () => {
  let seed: Seeder;
  let admin: { id: string };
  let community: { id: string; slug: string };

  beforeAll(async () => {
    seed = createSeeder(db);
    admin = await seed.profile();
    community = await seed.community({ visibility: "public" });
    await seed.member(community.id, admin.id, "admin");
  });

  afterAll(async () => {
    await seed?.cleanup();
  });

  it("joins a public community, and joining twice at once is fine", async () => {
    const person = await seed.profile();
    const results = await Promise.all([
      joinCommunityPublic(community.slug, person.id, db),
      joinCommunityPublic(community.slug, person.id, db),
    ]);
    for (const result of results) {
      expect(result).toEqual({ ok: true, slug: community.slug });
    }
    expect(await isMember(community.id, person.id)).toBe(true);
  });

  it("refuses a banned person", async () => {
    const person = await seed.profile();
    await seed.member(community.id, person.id);
    await expect(banCommunityMember(community.slug, admin.id, person.id, db)).resolves.toEqual({
      ok: true,
    });
    expect(await isMember(community.id, person.id)).toBe(false);
    await expect(joinCommunityPublic(community.slug, person.id, db)).resolves.toEqual({
      error: "You can’t join this community.",
    });
    expect(await isMember(community.id, person.id)).toBe(false);
  });

  it("never leaves a banned person as a member when they rejoin during the ban", async () => {
    for (let round = 0; round < 6; round++) {
      const person = await seed.profile();
      await seed.member(community.id, person.id);
      let banDone = false;
      const rejoin = async () => {
        // Two parallel loops keep a join in flight across the whole ban.
        const loop = async () => {
          while (!banDone) await joinCommunityPublic(community.slug, person.id, db);
        };
        await Promise.all([loop(), loop()]);
      };
      const banning = banCommunityMember(community.slug, admin.id, person.id, db).finally(() => {
        banDone = true;
      });
      const [ban] = await Promise.all([banning, rejoin()]);
      expect(ban).toEqual({ ok: true });
      expect(await isBanned(community.id, person.id)).toBe(true);
      expect(await isMember(community.id, person.id)).toBe(false);
    }
  });

  it("adds a promoted Host to every open edition that has room", async () => {
    const hostCommunity = await seed.community();
    await seed.member(hostCommunity.id, admin.id, "admin");
    const full = await seed.edition(hostCommunity.id, 2026);
    const roomy = await seed.edition(hostCommunity.id, 2027);
    for (let i = 0; i < COMMUNITY_HOSTS_MAX; i++) {
      const filler = await seed.profile();
      await seed.voice(full.id, filler.id);
    }
    const target = await seed.profile();
    await seed.member(hostCommunity.id, target.id);

    await expect(
      promoteCommunityHost(hostCommunity.slug, admin.id, target.id, db),
    ).resolves.toEqual({ ok: true });
    expect(await voiceEditionIds(target.id, [full.id, roomy.id])).toEqual([roomy.id]);

    // Promoting again is a no-op for edition rosters.
    await expect(
      promoteCommunityHost(hostCommunity.slug, admin.id, target.id, db),
    ).resolves.toEqual({ ok: true });
    expect(await voiceEditionIds(target.id, [full.id, roomy.id])).toEqual([roomy.id]);
  });
});
