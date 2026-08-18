import { cache } from "react";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import {
  listEditionsForCommunity,
  pickFeaturedEdition,
} from "@/lib/communities/editions";
import { showEditionNav } from "@/lib/communities/edition-status";
import { communityHeaderInvitePath } from "@/lib/communities/invite-code";
import { canManageCommunity } from "@/lib/communities/rules";
import { getCommunityBySlug } from "@/lib/communities/service";

export const getRequestCommunityBySlug = cache(
  async (slug: string, viewerProfileId?: string | null) => {
    try {
      return await getCommunityBySlug(slug, viewerProfileId);
    } catch {
      return null;
    }
  },
);

export const getRequestEditionsForCommunity = cache(
  async (communityId: string) => {
    try {
      return await listEditionsForCommunity(communityId);
    } catch {
      return [];
    }
  },
);

/**
 * Masthead data for `/communities/[slug]` — request-memoized so layout + page
 * share one community/editions fetch.
 */
export const getCommunityMasthead = cache(async (slug: string) => {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const community = await getRequestCommunityBySlug(slug, profile?.id);
  if (!community) return null;

  const editions = await getRequestEditionsForCommunity(community.id);
  const featured = pickFeaturedEdition(editions);
  const publicEdition = editions.find(
    (e) => e.status !== "draft" && showEditionNav(e.status),
  );
  const editionStatus =
    featured && featured.status !== "draft"
      ? featured.status
      : (publicEdition?.status ?? null);

  return {
    community,
    profile,
    canManage: canManageCommunity(community.viewerRole),
    editionStatus,
    invitePath: communityHeaderInvitePath(community.viewerInviteCode),
  };
});
